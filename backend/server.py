"""
Vanguard MLM System - Backend Server
Sistema de Marketing Multinível com 7 níveis de acesso
"""

import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Request, Response, Query, UploadFile, File, Form
from fastapi.responses import Response as FastAPIResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from pywebpush import webpush, WebPushException

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "mlm_vanguard")
JWT_SECRET = os.environ.get("JWT_SECRET", "mlm_vanguard_secret_key")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Scheduler
scheduler = AsyncIOScheduler()

# Access Levels
ACCESS_LEVELS = {
    0: "admin_tecnico",
    1: "admin_geral",
    2: "supervisor",
    3: "lider",
    4: "revendedor",
    5: "cliente",
    6: "embaixador"
}

# ==================== SCHEDULED JOBS ====================

async def release_commissions_job(db):
    """Release blocked commissions that are past the 7-day hold period"""
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        # Find blocked commissions ready for release
        blocked_commissions = await db.commissions.find({
            "status": "blocked",
            "release_at": {"$lte": now}
        }, {"_id": 0}).to_list(10000)
        
        released_count = 0
        for comm in blocked_commissions:
            # Update commission status
            await db.commissions.update_one(
                {"commission_id": comm["commission_id"]},
                {"$set": {"status": "available", "released_at": now}}
            )
            
            # Move from blocked to available balance
            await db.users.update_one(
                {"user_id": comm["user_id"]},
                {
                    "$inc": {
                        "blocked_balance": -comm["amount"],
                        "available_balance": comm["amount"]
                    }
                }
            )
            released_count += 1
        
        if released_count > 0:
            await db.logs.insert_one({
                "log_id": f"log_{uuid.uuid4().hex[:12]}",
                "action": "scheduled_commissions_released",
                "user_id": "system",
                "details": {"count": released_count},
                "created_at": now
            })
        
        logger.info(f"Scheduled job: Released {released_count} commissions")
    except Exception as e:
        logger.error(f"Error in release_commissions_job: {e}")

async def check_qualifications_job(db):
    """Monthly check for reseller qualifications"""
    try:
        settings = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
        
        min_qualification = settings.get("min_qualification_amount", 100) if settings else 100
        suspend_months = settings.get("inactive_months_suspend", 6) if settings else 6
        cancel_months = settings.get("inactive_months_cancel", 12) if settings else 12
        
        now = datetime.now(timezone.utc)
        
        # Get all resellers
        resellers = await db.users.find({"access_level": 4}, {"_id": 0}).to_list(10000)
        
        suspended_count = 0
        cancelled_count = 0
        qualified_count = 0
        
        for reseller in resellers:
            # Check if qualified this month
            personal_volume = reseller.get("personal_volume", 0)
            
            if personal_volume >= min_qualification:
                # Update qualification date
                await db.users.update_one(
                    {"user_id": reseller["user_id"]},
                    {"$set": {"last_qualification": now.isoformat()}}
                )
                qualified_count += 1
                continue
            
            # Check inactivity
            last_qual = reseller.get("last_qualification")
            if not last_qual:
                continue
            
            last_qual_date = datetime.fromisoformat(last_qual)
            if last_qual_date.tzinfo is None:
                last_qual_date = last_qual_date.replace(tzinfo=timezone.utc)
            
            months_inactive = (now - last_qual_date).days // 30
            
            if months_inactive >= cancel_months and reseller.get("status") != "cancelled":
                # Cancel and restructure network
                await db.users.update_one(
                    {"user_id": reseller["user_id"]},
                    {"$set": {"status": "cancelled"}}
                )
                
                # Move downline up to sponsor
                await db.users.update_many(
                    {"sponsor_id": reseller["user_id"]},
                    {
                        "$set": {"sponsor_id": reseller.get("sponsor_id")},
                        "$inc": {"hierarchy_level": -1}
                    }
                )
                cancelled_count += 1
            
            elif months_inactive >= suspend_months and reseller.get("status") == "active":
                await db.users.update_one(
                    {"user_id": reseller["user_id"]},
                    {"$set": {"status": "suspended"}}
                )
                suspended_count += 1
        
        # Reset monthly volumes for all resellers and leaders
        await db.users.update_many(
            {"access_level": {"$in": [3, 4]}},
            {"$set": {"personal_volume": 0, "team_volume": 0}}
        )
        
        await db.logs.insert_one({
            "log_id": f"log_{uuid.uuid4().hex[:12]}",
            "action": "scheduled_qualifications_checked",
            "user_id": "system",
            "details": {
                "qualified": qualified_count,
                "suspended": suspended_count,
                "cancelled": cancelled_count
            },
            "created_at": now.isoformat()
        })
        
        logger.info(f"Scheduled job: Qualifications checked - Qualified: {qualified_count}, Suspended: {suspended_count}, Cancelled: {cancelled_count}")
    except Exception as e:
        logger.error(f"Error in check_qualifications_job: {e}")

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(MONGO_URL)
    app.db = app.mongodb_client[DB_NAME]
    logger.info("Connected to MongoDB")
    
    # Create indexes
    await app.db.users.create_index("email", unique=True)
    await app.db.users.create_index("user_id", unique=True)
    await app.db.users.create_index("referral_code", unique=True)
    await app.db.products.create_index("product_id", unique=True)
    await app.db.orders.create_index("order_id", unique=True)
    
    # Initialize default admin and settings
    await initialize_defaults(app.db)
    
    # Setup scheduled jobs
    # Daily job: Release blocked commissions that are past 7 days
    scheduler.add_job(
        release_commissions_job,
        CronTrigger(hour=2, minute=0),  # Run daily at 2:00 AM
        args=[app.db],
        id="release_commissions",
        replace_existing=True
    )
    
    # Monthly job: Check qualifications on the 1st day of each month
    scheduler.add_job(
        check_qualifications_job,
        CronTrigger(day=1, hour=3, minute=0),  # Run on 1st day at 3:00 AM
        args=[app.db],
        id="check_qualifications",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started with jobs: release_commissions, check_qualifications")
    
    yield
    
    scheduler.shutdown()
    logger.info("Scheduler stopped")
    app.mongodb_client.close()
    logger.info("Disconnected from MongoDB")

app = FastAPI(title="Vanguard MLM API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    cpf: Optional[str] = None
    access_level: int = 5  # Default: Cliente
    sponsor_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    cpf: Optional[str] = None
    address: Optional[dict] = None
    bank_info: Optional[dict] = None

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    discount_price: Optional[float] = None
    category: str
    images: List[str] = []
    stock: int = 0
    weight: Optional[float] = None
    dimensions: Optional[dict] = None
    active: bool = True

class OrderCreate(BaseModel):
    items: List[dict]
    shipping_address: dict
    payment_method: str
    referral_code: Optional[str] = None

class WithdrawalRequest(BaseModel):
    amount: float

class SettingsUpdate(BaseModel):
    key: str
    value: str

class InviteRequest(BaseModel):
    email: EmailStr
    name: str
    target_level: int

class ConvertUserRequest(BaseModel):
    user_id: str
    new_access_level: int
    sponsor_code: Optional[str] = None

class AmbassadorCommission(BaseModel):
    user_id: str
    commission_rate: float

# ==================== HELPERS ====================

def generate_id(prefix: str = ""):
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def generate_referral_code():
    return uuid.uuid4().hex[:8].upper()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request):
    # Try cookie first, then Authorization header
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await request.app.db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_access_level(min_level: int):
    async def dependency(user: dict = Depends(get_current_user)):
        if user.get("access_level", 99) > min_level:
            raise HTTPException(status_code=403, detail="Access denied")
        return user
    return dependency

async def initialize_defaults(db):
    # Create default admin if not exists
    admin = await db.users.find_one({"email": "admin@vanguard.com"})
    if not admin:
        admin_user = {
            "user_id": generate_id("user_"),
            "email": "admin@vanguard.com",
            "password": hash_password("admin123"),
            "name": "Admin Técnico",
            "access_level": 0,
            "status": "active",
            "referral_code": generate_referral_code(),
            "sponsor_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_qualification": datetime.now(timezone.utc).isoformat(),
            "personal_volume": 0,
            "team_volume": 0,
            "available_balance": 0,
            "blocked_balance": 0,
            "points": 0,
            "hierarchy_level": 0
        }
        await db.users.insert_one(admin_user)
        logger.info("Default admin created: admin@vanguard.com / admin123")
    
    # Create default settings if not exists
    settings = await db.settings.find_one({"settings_id": "global"})
    if not settings:
        default_settings = {
            "settings_id": "global",
            "min_qualification_amount": 100,
            "min_withdrawal_amount": 50,
            "withdrawal_fee_percent": 5,
            "withdrawal_processing_days": 3,
            "commission_level_1": 10,
            "commission_level_2": 5,
            "commission_level_3": 5,
            "client_referral_commission": 5,
            "bonus_block_days": 7,
            "inactive_months_suspend": 6,
            "inactive_months_cancel": 12,
            "tracking_cookie_days": 30,
            "pagseguro_enabled": False,
            "pagseguro_sandbox": True,
            "mercadopago_enabled": False,
            "mercadopago_sandbox": True,
            "resend_enabled": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.settings.insert_one(default_settings)
        logger.info("Default settings created")

# ==================== AUTH ROUTES ====================

@app.post("/api/auth/register")
async def register(request: Request, data: UserRegister):
    db = request.app.db
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    sponsor_id = None
    hierarchy_level = 0
    
    # Handle sponsor for revendedores
    if data.sponsor_code and data.access_level == 4:
        sponsor = await db.users.find_one({"referral_code": data.sponsor_code}, {"_id": 0})
        if not sponsor:
            raise HTTPException(status_code=400, detail="Invalid sponsor code")
        if sponsor.get("access_level") not in [3, 4]:
            raise HTTPException(status_code=400, detail="Sponsor must be a reseller or team leader")
        sponsor_id = sponsor["user_id"]
        hierarchy_level = sponsor.get("hierarchy_level", 0) + 1
    
    user = {
        "user_id": generate_id("user_"),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "cpf": data.cpf,
        "access_level": data.access_level,
        "status": "active",
        "referral_code": generate_referral_code(),
        "sponsor_id": sponsor_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_qualification": datetime.now(timezone.utc).isoformat() if data.access_level == 4 else None,
        "personal_volume": 0,
        "team_volume": 0,
        "available_balance": 0,
        "blocked_balance": 0,
        "points": 0,
        "hierarchy_level": hierarchy_level,
        "ambassador_commission": 5 if data.access_level == 6 else None,
        "address": None,
        "bank_info": None
    }
    
    await db.users.insert_one(user)
    
    # Log action
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "user_registered",
        "user_id": user["user_id"],
        "details": {"email": data.email, "access_level": data.access_level},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = create_token({"user_id": user["user_id"]})
    
    # Re-fetch user without _id to avoid serialization issues
    user_response = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password": 0})
    
    return {"token": token, "user": user_response}

@app.post("/api/auth/login")
async def login(request: Request, response: Response, data: UserLogin):
    db = request.app.db
    
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("status") == "cancelled":
        raise HTTPException(status_code=401, detail="Account cancelled")
    
    token = create_token({"user_id": user["user_id"]})
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    user.pop("password")
    return {"token": token, "user": user}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    user_copy = dict(user)
    user_copy.pop("password", None)
    return user_copy

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# Google OAuth Session Handler
@app.post("/api/auth/session")
async def handle_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    auth_data = auth_response.json()
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    
    db = request.app.db
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        # Create new user as Cliente
        user = {
            "user_id": generate_id("user_"),
            "email": email,
            "password": None,
            "name": name,
            "picture": picture,
            "phone": None,
            "cpf": None,
            "access_level": 5,  # Cliente
            "status": "active",
            "referral_code": generate_referral_code(),
            "sponsor_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_qualification": None,
            "personal_volume": 0,
            "team_volume": 0,
            "available_balance": 0,
            "blocked_balance": 0,
            "points": 0,
            "hierarchy_level": 0,
            "ambassador_commission": None,
            "address": None,
            "bank_info": None
        }
        await db.users.insert_one(user)
    else:
        # Update user info
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
        user = await db.users.find_one({"email": email}, {"_id": 0})
    
    token = create_token({"user_id": user["user_id"]})
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    user.pop("password", None)
    return {"token": token, "user": user}

# ==================== USER MANAGEMENT ====================

@app.get("/api/users")
async def list_users(
    request: Request,
    access_level: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(require_access_level(2))
):
    db = request.app.db
    query = {}
    
    if access_level is not None:
        query["access_level"] = access_level
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    # Supervisors can only see their assigned resellers
    if user.get("access_level") == 2:
        assigned_ids = user.get("assigned_resellers", [])
        if assigned_ids:
            query["user_id"] = {"$in": assigned_ids}
        else:
            query["access_level"] = {"$in": [4, 5, 6]}
    
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"_id": 0, "password": 0}).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@app.get("/api/users/{user_id}")
async def get_user(request: Request, user_id: str, user: dict = Depends(require_access_level(2))):
    db = request.app.db
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    return target_user

# Note: User update route moved to admin section with extended fields

@app.post("/api/users/convert")
async def convert_user(request: Request, data: ConvertUserRequest, user: dict = Depends(require_access_level(1))):
    db = request.app.db
    
    target_user = await db.users.find_one({"user_id": data.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {"access_level": data.new_access_level}
    
    # If converting to reseller, need sponsor
    if data.new_access_level == 4:
        if not data.sponsor_code:
            raise HTTPException(status_code=400, detail="Sponsor code required for reseller")
        
        sponsor = await db.users.find_one({"referral_code": data.sponsor_code}, {"_id": 0})
        if not sponsor or sponsor.get("access_level") not in [3, 4]:
            raise HTTPException(status_code=400, detail="Invalid sponsor")
        
        update_data["sponsor_id"] = sponsor["user_id"]
        update_data["hierarchy_level"] = sponsor.get("hierarchy_level", 0) + 1
        update_data["last_qualification"] = datetime.now(timezone.utc).isoformat()
    
    # If promoting to leader
    if data.new_access_level == 3:
        if target_user.get("access_level") != 4:
            raise HTTPException(status_code=400, detail="Only resellers can become leaders")
    
    await db.users.update_one({"user_id": data.user_id}, {"$set": update_data})
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "user_converted",
        "user_id": data.user_id,
        "by_user_id": user["user_id"],
        "details": {"old_level": target_user.get("access_level"), "new_level": data.new_access_level},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    updated = await db.users.find_one({"user_id": data.user_id}, {"_id": 0, "password": 0})
    return updated

@app.post("/api/users/invite")
async def invite_user(request: Request, data: InviteRequest, user: dict = Depends(require_access_level(1))):
    db = request.app.db
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    invite = {
        "invite_id": generate_id("inv_"),
        "email": data.email,
        "name": data.name,
        "target_level": data.target_level,
        "invited_by": user["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    }
    
    await db.invites.insert_one(invite)
    
    # TODO: Send email via Resend when configured
    
    return {"message": "Invite sent", "invite_id": invite["invite_id"]}

class ResellerInviteRequest(BaseModel):
    email: EmailStr
    name: str
    type: str = "reseller"

@app.post("/api/invites/send")
async def send_reseller_invite(request: Request, data: ResellerInviteRequest, user: dict = Depends(get_current_user)):
    """Send invite to become a reseller in user's network"""
    db = request.app.db
    
    # Only resellers (4) and leaders (3) can invite new resellers
    if user.get("access_level") not in [3, 4]:
        raise HTTPException(status_code=403, detail="Only resellers and leaders can invite new resellers")
    
    # Check if user already exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado no sistema")
    
    # Check for existing pending invite
    existing_invite = await db.invites.find_one({
        "email": data.email,
        "status": "pending"
    })
    if existing_invite:
        raise HTTPException(status_code=400, detail="Já existe um convite pendente para este email")
    
    invite = {
        "invite_id": generate_id("inv_"),
        "email": data.email,
        "name": data.name,
        "target_level": 4,  # Reseller
        "invited_by": user["user_id"],
        "sponsor_code": user.get("referral_code"),
        "type": data.type,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    
    await db.invites.insert_one(invite)
    
    # Log the invite
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "reseller_invite_sent",
        "user_id": user["user_id"],
        "details": {"email": data.email, "name": data.name},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send push notification to inviter confirming the invite was sent
    await send_push_notification(
        db,
        user["user_id"],
        "Convite Enviado! 📩",
        f"Convite enviado para {data.name}. Aguarde a confirmação!",
        {"url": "/network", "type": "invite_sent"}
    )
    
    # TODO: Send email via Resend when configured
    
    return {"message": "Convite enviado com sucesso", "invite_id": invite["invite_id"]}

@app.get("/api/invites/sent")
async def get_sent_invites(request: Request, user: dict = Depends(get_current_user)):
    """Get list of invites sent by the user"""
    db = request.app.db
    
    invites = await db.invites.find(
        {"invited_by": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"invites": invites}

@app.post("/api/users/ambassador-commission")
async def set_ambassador_commission(request: Request, data: AmbassadorCommission, user: dict = Depends(require_access_level(1))):
    db = request.app.db
    
    target_user = await db.users.find_one({"user_id": data.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get("access_level") != 6:
        raise HTTPException(status_code=400, detail="User is not an ambassador")
    
    await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {"ambassador_commission": data.commission_rate}}
    )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "ambassador_commission_updated",
        "user_id": data.user_id,
        "by_user_id": user["user_id"],
        "details": {"commission_rate": data.commission_rate},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Commission updated"}

# ==================== USER MANAGEMENT (ADMIN) ====================

class UserUpdateAdmin(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    access_level: Optional[int] = None
    status: Optional[str] = None
    cpf: Optional[str] = None
    available_balance: Optional[float] = None
    blocked_balance: Optional[float] = None
    points: Optional[int] = None
    address: Optional[dict] = None
    bank_info: Optional[dict] = None
    supervisor_id: Optional[str] = None

@app.put("/api/users/{user_id}")
async def update_user(
    request: Request, 
    user_id: str, 
    data: UserUpdateAdmin, 
    current_user: dict = Depends(get_current_user)
):
    """Update user details - Admin can update any user, users can update their own profile"""
    db = request.app.db
    
    # Check permissions: admin (level <= 1) can update anyone, others only themselves
    is_admin = current_user.get("access_level", 99) <= 1
    is_self = current_user["user_id"] == user_id
    
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find the user to update
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Build update dict with only provided fields
    update_data = {}
    
    # Fields that regular users can update (profile fields)
    if data.name is not None:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.cpf is not None:
        update_data["cpf"] = data.cpf
    if data.address is not None:
        update_data["address"] = data.address
    if data.bank_info is not None:
        update_data["bank_info"] = data.bank_info
    
    # Admin-only fields
    if is_admin:
        if data.email is not None:
            # Check if email is already in use by another user
            existing = await db.users.find_one({"email": data.email, "user_id": {"$ne": user_id}})
            if existing:
                raise HTTPException(status_code=400, detail="Email já está em uso")
            update_data["email"] = data.email
        if data.password:
            update_data["password"] = pwd_context.hash(data.password)
        if data.access_level is not None:
            update_data["access_level"] = data.access_level
        if data.status is not None:
            update_data["status"] = data.status
        if data.available_balance is not None:
            update_data["available_balance"] = data.available_balance
        if data.blocked_balance is not None:
            update_data["blocked_balance"] = data.blocked_balance
        if data.points is not None:
            update_data["points"] = data.points
        if data.supervisor_id is not None:
            # Validate supervisor exists and is a supervisor (level 2)
            if data.supervisor_id:
                supervisor = await db.users.find_one({"user_id": data.supervisor_id})
                if not supervisor:
                    raise HTTPException(status_code=400, detail="Supervisor não encontrado")
                if supervisor.get("access_level") != 2:
                    raise HTTPException(status_code=400, detail="Usuário selecionado não é um supervisor")
            update_data["supervisor_id"] = data.supervisor_id or None
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    
    # Log the action
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "user_updated",
        "user_id": user_id,
        "by_user_id": current_user["user_id"],
        "details": {k: v for k, v in update_data.items() if k != "password"},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    return updated_user

@app.delete("/api/users/{user_id}")
async def delete_user(
    request: Request, 
    user_id: str, 
    current_user: dict = Depends(require_access_level(0))
):
    """Delete user (Admin Técnico only)"""
    db = request.app.db
    
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Don't allow deleting yourself
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta")
    
    # Soft delete - just change status to cancelled
    await db.users.update_one(
        {"user_id": user_id}, 
        {"$set": {"status": "cancelled", "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "user_deleted",
        "user_id": user_id,
        "by_user_id": current_user["user_id"],
        "details": {"name": target_user.get("name"), "email": target_user.get("email")},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Usuário excluído"}

# ==================== NETWORK / HIERARCHY ====================

@app.get("/api/network/tree")
async def get_network_tree(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.db
    
    async def build_tree(user_id: str, depth: int = 0, max_depth: int = 3):
        if depth >= max_depth:
            return []
        
        children = await db.users.find(
            {"sponsor_id": user_id, "access_level": {"$in": [3, 4]}},
            {"_id": 0, "password": 0}
        ).to_list(100)
        
        result = []
        for child in children:
            child["children"] = await build_tree(child["user_id"], depth + 1, max_depth)
            result.append(child)
        
        return result
    
    # For admins, show full network from top
    if user.get("access_level") <= 1:
        root_users = await db.users.find(
            {"sponsor_id": None, "access_level": {"$in": [3, 4]}},
            {"_id": 0, "password": 0}
        ).to_list(100)
        
        for root in root_users:
            root["children"] = await build_tree(root["user_id"])
        
        return {"tree": root_users}
    
    # For resellers/leaders, show their own network
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password": 0})
    user_data["children"] = await build_tree(user["user_id"])
    
    return {"tree": [user_data]}

@app.get("/api/network/upline/{user_id}")
async def get_upline(request: Request, user_id: str, user: dict = Depends(get_current_user)):
    db = request.app.db
    
    upline = []
    current_id = user_id
    
    for _ in range(3):  # Max 3 levels up
        current_user = await db.users.find_one({"user_id": current_id}, {"_id": 0, "password": 0})
        if not current_user or not current_user.get("sponsor_id"):
            break
        
        sponsor = await db.users.find_one(
            {"user_id": current_user["sponsor_id"]},
            {"_id": 0, "password": 0}
        )
        if sponsor:
            upline.append(sponsor)
            current_id = sponsor["user_id"]
        else:
            break
    
    return {"upline": upline}

@app.get("/api/network/stats")
async def get_network_stats(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.db
    
    user_id = user["user_id"]
    
    # Count direct referrals
    level_1 = await db.users.count_documents({"sponsor_id": user_id, "access_level": {"$in": [3, 4]}})
    
    # Count level 2
    level_1_ids = [u["user_id"] for u in await db.users.find({"sponsor_id": user_id}, {"user_id": 1}).to_list(100)]
    level_2 = await db.users.count_documents({"sponsor_id": {"$in": level_1_ids}, "access_level": {"$in": [3, 4]}}) if level_1_ids else 0
    
    # Count level 3
    level_2_ids = [u["user_id"] for u in await db.users.find({"sponsor_id": {"$in": level_1_ids}}, {"user_id": 1}).to_list(100)] if level_1_ids else []
    level_3 = await db.users.count_documents({"sponsor_id": {"$in": level_2_ids}, "access_level": {"$in": [3, 4]}}) if level_2_ids else 0
    
    return {
        "total_network": level_1 + level_2 + level_3,
        "level_1": level_1,
        "level_2": level_2,
        "level_3": level_3,
        "active_this_month": await db.users.count_documents({
            "sponsor_id": user_id,
            "status": "active",
            "last_qualification": {"$gte": datetime.now(timezone.utc).replace(day=1).isoformat()}
        })
    }

# ==================== PRODUCTS ====================

@app.get("/api/products")
async def list_products(
    request: Request,
    category: Optional[str] = None,
    active: bool = True,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    db = request.app.db
    query = {}
    
    if active:
        query["active"] = True
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {"products": products, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@app.get("/api/products/{product_id}")
async def get_product(request: Request, product_id: str):
    db = request.app.db
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/products")
async def create_product(request: Request, data: ProductCreate, user: dict = Depends(require_access_level(1))):
    db = request.app.db
    
    product = {
        "product_id": generate_id("prod_"),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"]
    }
    
    await db.products.insert_one(product)
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "product_created",
        "user_id": user["user_id"],
        "details": {"product_id": product["product_id"], "name": data.name},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Re-fetch product without _id
    product_response = await db.products.find_one({"product_id": product["product_id"]}, {"_id": 0})
    return product_response

@app.put("/api/products/{product_id}")
async def update_product(request: Request, product_id: str, data: ProductCreate, user: dict = Depends(require_access_level(1))):
    db = request.app.db
    
    existing = await db.products.find_one({"product_id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["user_id"]
    
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "product_updated",
        "user_id": user["user_id"],
        "details": {"product_id": product_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    updated = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return updated

@app.delete("/api/products/{product_id}")
async def delete_product(request: Request, product_id: str, user: dict = Depends(require_access_level(1))):
    db = request.app.db
    
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "product_deleted",
        "user_id": user["user_id"],
        "details": {"product_id": product_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Product deleted"}

@app.get("/api/categories")
async def list_categories(request: Request):
    db = request.app.db
    categories = await db.products.distinct("category")
    return {"categories": categories}

# ==================== ORDERS ====================

@app.post("/api/orders")
async def create_order(request: Request, data: OrderCreate, user: dict = Depends(get_current_user)):
    db = request.app.db
    settings = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
    
    # Calculate totals
    subtotal = 0
    order_items = []
    
    for item in data.items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item['product_id']} not found")
        
        price = product.get("discount_price") or product["price"]
        item_total = price * item["quantity"]
        subtotal += item_total
        
        order_items.append({
            "product_id": product["product_id"],
            "name": product["name"],
            "price": price,
            "original_price": product["price"],
            "quantity": item["quantity"],
            "total": item_total
        })
    
    # Determine referrer
    referrer_id = None
    referrer_type = None
    
    if data.referral_code:
        referrer = await db.users.find_one({"referral_code": data.referral_code}, {"_id": 0})
        if referrer:
            referrer_id = referrer["user_id"]
            referrer_type = ACCESS_LEVELS.get(referrer.get("access_level"), "unknown")
    
    # Calculate shipping (simplified - should integrate with carrier API)
    shipping = 15.0  # Placeholder
    
    order = {
        "order_id": generate_id("ord_"),
        "user_id": user["user_id"],
        "items": order_items,
        "subtotal": subtotal,
        "shipping": shipping,
        "total": subtotal + shipping,
        "commission_base": subtotal,  # Commission calculated on product value, not shipping
        "shipping_address": data.shipping_address,
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "order_status": "pending",
        "referrer_id": referrer_id,
        "referrer_type": referrer_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "paid_at": None,
        "shipped_at": None,
        "delivered_at": None,
        "cancelled_at": None
    }
    
    await db.orders.insert_one(order)
    
    # Re-fetch order without _id
    order_response = await db.orders.find_one({"order_id": order["order_id"]}, {"_id": 0})
    return order_response

@app.get("/api/orders")
async def list_orders(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    db = request.app.db
    query = {}
    
    # Regular users only see their orders
    if user.get("access_level") > 2:
        query["user_id"] = user["user_id"]
    
    if status:
        query["order_status"] = status
    
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@app.get("/api/orders/{order_id}")
async def get_order(request: Request, order_id: str, user: dict = Depends(get_current_user)):
    db = request.app.db
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check access
    if user.get("access_level") > 2 and order["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order

@app.put("/api/orders/{order_id}/status")
async def update_order_status(
    request: Request,
    order_id: str,
    status: str = Query(...),
    user: dict = Depends(require_access_level(2))
):
    db = request.app.db
    settings = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {"order_status": status}
    
    if status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
        update_data["payment_status"] = "paid"
        
        # Process commissions
        await process_order_commissions(db, order, settings)
    
    elif status == "shipped":
        update_data["shipped_at"] = datetime.now(timezone.utc).isoformat()
    
    elif status == "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
    
    elif status == "cancelled":
        update_data["cancelled_at"] = datetime.now(timezone.utc).isoformat()
        
        # Reverse commissions if within 7 days
        if order.get("paid_at"):
            paid_at = datetime.fromisoformat(order["paid_at"])
            if datetime.now(timezone.utc) - paid_at <= timedelta(days=7):
                await reverse_order_commissions(db, order_id)
    
    await db.orders.update_one({"order_id": order_id}, {"$set": update_data})
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "order_status_updated",
        "user_id": user["user_id"],
        "details": {"order_id": order_id, "new_status": status},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Order status updated"}

async def process_order_commissions(db, order, settings):
    """Process MLM commissions for an order"""
    
    commission_base = order.get("commission_base", 0)
    referrer_id = order.get("referrer_id")
    referrer_type = order.get("referrer_type")
    bonus_block_days = settings.get("bonus_block_days", 7)
    
    if not referrer_id:
        return
    
    referrer = await db.users.find_one({"user_id": referrer_id}, {"_id": 0})
    if not referrer:
        return
    
    commissions_created = []
    release_at = (datetime.now(timezone.utc) + timedelta(days=bonus_block_days)).isoformat()
    
    # Handle different referrer types
    if referrer_type == "embaixador":
        # Ambassador gets custom commission
        rate = referrer.get("ambassador_commission", 5) / 100
        amount = commission_base * rate
        
        commission = {
            "commission_id": generate_id("comm_"),
            "order_id": order["order_id"],
            "user_id": referrer_id,
            "level": 0,
            "rate": rate * 100,
            "base_amount": commission_base,
            "amount": amount,
            "status": "blocked",
            "release_at": release_at,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.commissions.insert_one(commission)
        
        # Add to blocked balance
        await db.users.update_one(
            {"user_id": referrer_id},
            {"$inc": {"blocked_balance": amount}}
        )
        commissions_created.append(commission)
    
    elif referrer_type == "cliente":
        # Client referral gets single commission
        rate = settings.get("client_referral_commission", 5) / 100
        amount = commission_base * rate
        
        commission = {
            "commission_id": generate_id("comm_"),
            "order_id": order["order_id"],
            "user_id": referrer_id,
            "level": 0,
            "rate": rate * 100,
            "base_amount": commission_base,
            "amount": amount,
            "status": "blocked",
            "release_at": release_at,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.commissions.insert_one(commission)
        
        await db.users.update_one(
            {"user_id": referrer_id},
            {"$inc": {"blocked_balance": amount}}
        )
        commissions_created.append(commission)
    
    elif referrer_type in ["revendedor", "lider"]:
        # MLM commissions - up to 3 levels
        commission_rates = [
            settings.get("commission_level_1", 10) / 100,
            settings.get("commission_level_2", 5) / 100,
            settings.get("commission_level_3", 5) / 100
        ]
        
        current_user_id = referrer_id
        
        for level in range(3):
            if not current_user_id:
                break
            
            current_user = await db.users.find_one({"user_id": current_user_id}, {"_id": 0})
            if not current_user or current_user.get("status") != "active":
                # Skip to next level if user is inactive
                current_user_id = current_user.get("sponsor_id") if current_user else None
                continue
            
            rate = commission_rates[level]
            amount = commission_base * rate
            
            commission = {
                "commission_id": generate_id("comm_"),
                "order_id": order["order_id"],
                "user_id": current_user_id,
                "level": level + 1,
                "rate": rate * 100,
                "base_amount": commission_base,
                "amount": amount,
                "status": "blocked",
                "release_at": release_at,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.commissions.insert_one(commission)
            
            await db.users.update_one(
                {"user_id": current_user_id},
                {"$inc": {"blocked_balance": amount}}
            )
            commissions_created.append(commission)
            
            # Move up the chain
            current_user_id = current_user.get("sponsor_id")
    
    # Update personal volume for buyer if they're a reseller
    buyer = await db.users.find_one({"user_id": order["user_id"]}, {"_id": 0})
    if buyer and buyer.get("access_level") in [3, 4]:
        await db.users.update_one(
            {"user_id": order["user_id"]},
            {"$inc": {"personal_volume": commission_base}}
        )
        
        # Update team volume for upline
        current_sponsor_id = buyer.get("sponsor_id")
        while current_sponsor_id:
            await db.users.update_one(
                {"user_id": current_sponsor_id},
                {"$inc": {"team_volume": commission_base}}
            )
            sponsor = await db.users.find_one({"user_id": current_sponsor_id}, {"_id": 0})
            current_sponsor_id = sponsor.get("sponsor_id") if sponsor else None
    
    # Send push notifications for each commission created
    for comm in commissions_created:
        try:
            amount_str = f"R$ {comm['amount']:.2f}".replace('.', ',')
            level_str = f"{comm['level']}º nível" if comm['level'] > 0 else "indicação direta"
            
            # Create in-app notification
            await create_notification(
                db,
                comm["user_id"],
                "Nova Comissão Recebida! 💰",
                f"Você recebeu {amount_str} de comissão ({level_str}). O valor será liberado em 7 dias.",
                "commission",
                {"url": "/commissions", "amount": comm["amount"]}
            )
            
            # Also send push notification
            await send_push_notification(
                db,
                comm["user_id"],
                "Nova Comissão Recebida! 💰",
                f"Você recebeu {amount_str} de comissão ({level_str}). O valor será liberado em 7 dias.",
                {"url": "/commissions", "type": "commission", "amount": comm["amount"]}
            )
        except Exception as e:
            logger.error(f"Error sending commission notification: {e}")
    
    return commissions_created

async def reverse_order_commissions(db, order_id: str):
    """Reverse commissions for a cancelled order"""
    
    commissions = await db.commissions.find({"order_id": order_id}).to_list(100)
    
    for comm in commissions:
        if comm.get("status") == "blocked":
            await db.users.update_one(
                {"user_id": comm["user_id"]},
                {"$inc": {"blocked_balance": -comm["amount"]}}
            )
        elif comm.get("status") == "available":
            await db.users.update_one(
                {"user_id": comm["user_id"]},
                {"$inc": {"available_balance": -comm["amount"]}}
            )
        
        await db.commissions.update_one(
            {"commission_id": comm["commission_id"]},
            {"$set": {"status": "reversed", "reversed_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "commissions_reversed",
        "details": {"order_id": order_id, "commissions_count": len(commissions)},
        "created_at": datetime.now(timezone.utc).isoformat()
    })

# ==================== COMMISSIONS ====================

@app.get("/api/commissions")
async def list_commissions(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    db = request.app.db
    query = {"user_id": user["user_id"]}
    
    if status:
        query["status"] = status
    
    total = await db.commissions.count_documents(query)
    commissions = await db.commissions.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {"commissions": commissions, "total": total, "page": page}

@app.get("/api/commissions/summary")
async def get_commission_summary(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.db
    user_id = user["user_id"]
    
    # Get totals by level
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$level",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    by_level = {}
    async for doc in db.commissions.aggregate(pipeline):
        by_level[doc["_id"]] = {"total": doc["total"], "count": doc["count"]}
    
    # Get totals by status
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$amount"}
        }}
    ]
    
    by_status = {}
    async for doc in db.commissions.aggregate(pipeline):
        by_status[doc["_id"]] = doc["total"]
    
    # This month
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
    this_month = await db.commissions.aggregate([
        {"$match": {"user_id": user_id, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    return {
        "by_level": by_level,
        "by_status": by_status,
        "this_month": this_month[0]["total"] if this_month else 0,
        "available_balance": user.get("available_balance", 0),
        "blocked_balance": user.get("blocked_balance", 0)
    }

# ==================== WALLET / WITHDRAWALS ====================

@app.get("/api/wallet")
async def get_wallet(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.db
    
    # Get recent transactions
    transactions = await db.transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "available_balance": user.get("available_balance", 0),
        "blocked_balance": user.get("blocked_balance", 0),
        "transactions": transactions
    }

@app.post("/api/wallet/withdraw")
async def request_withdrawal(request: Request, data: WithdrawalRequest, user: dict = Depends(get_current_user)):
    db = request.app.db
    settings = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
    
    min_amount = settings.get("min_withdrawal_amount", 50)
    fee_percent = settings.get("withdrawal_fee_percent", 5)
    
    if data.amount < min_amount:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is R$ {min_amount}")
    
    if data.amount > user.get("available_balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if not user.get("bank_info"):
        raise HTTPException(status_code=400, detail="Please add bank information first")
    
    fee = data.amount * (fee_percent / 100)
    net_amount = data.amount - fee
    
    withdrawal = {
        "withdrawal_id": generate_id("wd_"),
        "user_id": user["user_id"],
        "amount": data.amount,
        "fee": fee,
        "net_amount": net_amount,
        "status": "pending",
        "bank_info": user.get("bank_info"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None,
        "paid_at": None
    }
    
    await db.withdrawals.insert_one(withdrawal)
    
    # Deduct from available balance
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"available_balance": -data.amount}}
    )
    
    # Create transaction record
    await db.transactions.insert_one({
        "transaction_id": generate_id("tx_"),
        "user_id": user["user_id"],
        "type": "withdrawal_request",
        "amount": -data.amount,
        "reference_id": withdrawal["withdrawal_id"],
        "description": f"Solicitação de saque - R$ {data.amount:.2f}",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Re-fetch withdrawal without _id
    withdrawal_response = await db.withdrawals.find_one({"withdrawal_id": withdrawal["withdrawal_id"]}, {"_id": 0})
    return withdrawal_response

@app.get("/api/wallet/withdrawals")
async def list_withdrawals(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    db = request.app.db
    query = {}
    
    # Regular users only see their withdrawals
    if user.get("access_level") > 1:
        query["user_id"] = user["user_id"]
    
    if status:
        query["status"] = status
    
    total = await db.withdrawals.count_documents(query)
    withdrawals = await db.withdrawals.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {"withdrawals": withdrawals, "total": total, "page": page}

@app.put("/api/wallet/withdrawals/{withdrawal_id}")
async def update_withdrawal(
    request: Request,
    withdrawal_id: str,
    status: str = Query(...),
    user: dict = Depends(require_access_level(1))
):
    db = request.app.db
    
    withdrawal = await db.withdrawals.find_one({"withdrawal_id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    update_data = {"status": status}
    
    if status == "approved":
        update_data["processed_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "rejected":
        # Refund the amount
        await db.users.update_one(
            {"user_id": withdrawal["user_id"]},
            {"$inc": {"available_balance": withdrawal["amount"]}}
        )
        
        await db.transactions.insert_one({
            "transaction_id": generate_id("tx_"),
            "user_id": withdrawal["user_id"],
            "type": "withdrawal_refund",
            "amount": withdrawal["amount"],
            "reference_id": withdrawal_id,
            "description": "Estorno de saque rejeitado",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.withdrawals.update_one({"withdrawal_id": withdrawal_id}, {"$set": update_data})
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "withdrawal_updated",
        "user_id": user["user_id"],
        "details": {"withdrawal_id": withdrawal_id, "new_status": status},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Withdrawal updated"}

@app.get("/api/admin/withdrawals/report")
async def get_withdrawals_report(
    request: Request,
    status: str = "approved",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(require_access_level(1))
):
    """Get detailed withdrawal report with user bank info for payment processing"""
    db = request.app.db
    
    # Build query
    query = {"status": status}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" not in query:
            query["created_at"] = {}
        query["created_at"]["$lte"] = end_date
    
    # Get withdrawals with user info
    withdrawals = await db.withdrawals.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with user data
    report_data = []
    total_amount = 0
    
    for w in withdrawals:
        user_data = await db.users.find_one(
            {"user_id": w["user_id"]}, 
            {"_id": 0, "name": 1, "email": 1, "cpf": 1, "phone": 1, "bank_info": 1}
        )
        
        if user_data:
            bank_info = user_data.get("bank_info", {}) or {}
            report_item = {
                "withdrawal_id": w["withdrawal_id"],
                "user_id": w["user_id"],
                "name": user_data.get("name", ""),
                "email": user_data.get("email", ""),
                "cpf": user_data.get("cpf", ""),
                "phone": user_data.get("phone", ""),
                "amount": w["amount"],
                "status": w["status"],
                "created_at": w["created_at"],
                "approved_at": w.get("approved_at"),
                "bank_name": bank_info.get("bank_name", ""),
                "bank_code": bank_info.get("bank_code", ""),
                "agency": bank_info.get("agency", ""),
                "account": bank_info.get("account", ""),
                "account_type": bank_info.get("account_type", ""),
                "pix_key": bank_info.get("pix_key", ""),
            }
            report_data.append(report_item)
            total_amount += w["amount"]
    
    return {
        "report": report_data,
        "total_count": len(report_data),
        "total_amount": total_amount,
        "status_filter": status,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/admin/withdrawals/export")
async def export_withdrawals_report(
    request: Request,
    status: str = "approved",
    format: str = "csv",
    user: dict = Depends(require_access_level(1))
):
    """Export withdrawal report as CSV or JSON"""
    db = request.app.db
    
    # Get report data
    report_response = await get_withdrawals_report(request, status, None, None, user)
    report_data = report_response["report"]
    
    if format == "json":
        return report_response
    
    # Generate CSV
    import io
    import csv
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID Saque", "ID Usuário", "Nome", "Email", "CPF", "Telefone",
        "Valor (R$)", "Status", "Data Solicitação", "Data Aprovação",
        "Banco", "Código Banco", "Agência", "Conta", "Tipo Conta", "Chave PIX"
    ])
    
    # Data
    for item in report_data:
        writer.writerow([
            item["withdrawal_id"],
            item["user_id"],
            item["name"],
            item["email"],
            item["cpf"],
            item["phone"],
            f"{item['amount']:.2f}",
            item["status"],
            item["created_at"],
            item.get("approved_at", ""),
            item["bank_name"],
            item["bank_code"],
            item["agency"],
            item["account"],
            item["account_type"],
            item["pix_key"]
        ])
    
    csv_content = output.getvalue()
    output.close()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=saques_{status}_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )

@app.get("/api/admin/supervisors")
async def list_supervisors(request: Request, user: dict = Depends(require_access_level(1))):
    """Get list of all supervisors for assignment"""
    db = request.app.db
    
    supervisors = await db.users.find(
        {"access_level": 2, "status": "active"},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    ).to_list(100)
    
    return {"supervisors": supervisors}

@app.get("/api/supervisor/users")
async def get_supervised_users(
    request: Request,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Get users supervised by the current supervisor"""
    db = request.app.db
    
    # Only supervisors can access this
    if user.get("access_level") != 2:
        raise HTTPException(status_code=403, detail="Acesso apenas para supervisores")
    
    query = {"supervisor_id": user["user_id"]}
    
    total = await db.users.count_documents(query)
    users = await db.users.find(
        query,
        {"_id": 0, "password": 0}
    ).sort("name", 1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

# ==================== SETTINGS (Admin Only) ====================

@app.get("/api/settings")
async def get_settings(request: Request, user: dict = Depends(require_access_level(0))):
    db = request.app.db
    settings = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
    return settings

@app.put("/api/settings")
async def update_settings(request: Request, user: dict = Depends(require_access_level(0))):
    db = request.app.db
    body = await request.json()
    
    # Remove protected fields
    body.pop("settings_id", None)
    body.pop("created_at", None)
    
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    body["updated_by"] = user["user_id"]
    
    await db.settings.update_one({"settings_id": "global"}, {"$set": body})
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "settings_updated",
        "user_id": user["user_id"],
        "details": body,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    updated = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
    return updated

# ==================== REPORTS / DASHBOARD ====================

@app.get("/api/dashboard/admin")
async def admin_dashboard(request: Request, user: dict = Depends(require_access_level(1))):
    db = request.app.db
    
    # User counts
    user_counts = {}
    for level, name in ACCESS_LEVELS.items():
        user_counts[name] = await db.users.count_documents({"access_level": level})
    
    # Active/Inactive resellers
    active_resellers = await db.users.count_documents({"access_level": 4, "status": "active"})
    suspended_resellers = await db.users.count_documents({"access_level": 4, "status": "suspended"})
    
    # Orders summary
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
    
    orders_this_month = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": month_start}, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # Commissions summary
    commissions_pending = await db.commissions.aggregate([
        {"$match": {"status": "blocked"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    commissions_paid = await db.commissions.aggregate([
        {"$match": {"status": "available"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Withdrawals pending
    withdrawals_pending = await db.withdrawals.aggregate([
        {"$match": {"status": "pending"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    return {
        "user_counts": user_counts,
        "active_resellers": active_resellers,
        "suspended_resellers": suspended_resellers,
        "orders_this_month": {
            "total": orders_this_month[0]["total"] if orders_this_month else 0,
            "count": orders_this_month[0]["count"] if orders_this_month else 0
        },
        "commissions": {
            "pending": commissions_pending[0]["total"] if commissions_pending else 0,
            "paid": commissions_paid[0]["total"] if commissions_paid else 0
        },
        "withdrawals_pending": {
            "total": withdrawals_pending[0]["total"] if withdrawals_pending else 0,
            "count": withdrawals_pending[0]["count"] if withdrawals_pending else 0
        }
    }

@app.get("/api/dashboard/reseller")
async def reseller_dashboard(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.db
    user_id = user["user_id"]
    
    # Network stats
    network = await get_network_stats(request, user)
    
    # Commission summary
    commission_summary = await get_commission_summary(request, user)
    
    # Recent orders from referral link
    recent_referral_orders = await db.orders.find(
        {"referrer_id": user_id, "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Qualification status
    settings = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
    min_qualification = settings.get("min_qualification_amount", 100)
    personal_volume = user.get("personal_volume", 0)
    
    # Calculate months since last qualification
    last_qual = user.get("last_qualification")
    months_inactive = 0
    if last_qual:
        last_qual_date = datetime.fromisoformat(last_qual)
        months_inactive = (datetime.now(timezone.utc) - last_qual_date).days // 30
    
    return {
        "network": network,
        "commissions": commission_summary,
        "recent_referral_orders": recent_referral_orders,
        "qualification": {
            "min_required": min_qualification,
            "current_volume": personal_volume,
            "is_qualified": personal_volume >= min_qualification,
            "months_inactive": months_inactive
        },
        "referral_code": user.get("referral_code"),
        "available_balance": user.get("available_balance", 0),
        "blocked_balance": user.get("blocked_balance", 0)
    }

# ==================== LOGS ====================

@app.get("/api/logs")
async def list_logs(
    request: Request,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(require_access_level(1))
):
    db = request.app.db
    query = {}
    
    if action:
        query["action"] = action
    if user_id:
        query["user_id"] = user_id
    
    total = await db.logs.count_documents(query)
    logs = await db.logs.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {"logs": logs, "total": total, "page": page}

# ==================== SCHEDULED TASKS ====================

@app.post("/api/admin/process-commissions")
async def process_blocked_commissions(request: Request, user: dict = Depends(require_access_level(0))):
    """Release blocked commissions that have passed the 7-day period"""
    db = request.app.db
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Find commissions to release
    commissions = await db.commissions.find({
        "status": "blocked",
        "release_at": {"$lte": now}
    }).to_list(1000)
    
    released_count = 0
    
    for comm in commissions:
        # Move from blocked to available
        await db.users.update_one(
            {"user_id": comm["user_id"]},
            {
                "$inc": {
                    "blocked_balance": -comm["amount"],
                    "available_balance": comm["amount"]
                }
            }
        )
        
        await db.commissions.update_one(
            {"commission_id": comm["commission_id"]},
            {"$set": {"status": "available", "released_at": now}}
        )
        
        await db.transactions.insert_one({
            "transaction_id": generate_id("tx_"),
            "user_id": comm["user_id"],
            "type": "commission_released",
            "amount": comm["amount"],
            "reference_id": comm["commission_id"],
            "description": f"Comissão liberada - Nível {comm.get('level', 0)}",
            "created_at": now
        })
        
        released_count += 1
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "commissions_released",
        "user_id": user["user_id"],
        "details": {"count": released_count},
        "created_at": now
    })
    
    return {"message": f"Released {released_count} commissions"}

@app.post("/api/admin/check-qualifications")
async def check_qualifications(request: Request, user: dict = Depends(require_access_level(0))):
    """Monthly check for reseller qualifications"""
    db = request.app.db
    settings = await db.settings.find_one({"settings_id": "global"}, {"_id": 0})
    
    min_qualification = settings.get("min_qualification_amount", 100)
    suspend_months = settings.get("inactive_months_suspend", 6)
    cancel_months = settings.get("inactive_months_cancel", 12)
    
    now = datetime.now(timezone.utc)
    
    # Get all resellers
    resellers = await db.users.find({"access_level": 4}, {"_id": 0}).to_list(10000)
    
    suspended_count = 0
    cancelled_count = 0
    
    for reseller in resellers:
        last_qual = reseller.get("last_qualification")
        if not last_qual:
            continue
        
        last_qual_date = datetime.fromisoformat(last_qual)
        if last_qual_date.tzinfo is None:
            last_qual_date = last_qual_date.replace(tzinfo=timezone.utc)
        
        months_inactive = (now - last_qual_date).days // 30
        
        if months_inactive >= cancel_months and reseller.get("status") != "cancelled":
            # Cancel and restructure network
            await db.users.update_one(
                {"user_id": reseller["user_id"]},
                {"$set": {"status": "cancelled"}}
            )
            
            # Move downline up
            await db.users.update_many(
                {"sponsor_id": reseller["user_id"]},
                {
                    "$set": {"sponsor_id": reseller.get("sponsor_id")},
                    "$inc": {"hierarchy_level": -1}
                }
            )
            
            cancelled_count += 1
        
        elif months_inactive >= suspend_months and reseller.get("status") == "active":
            await db.users.update_one(
                {"user_id": reseller["user_id"]},
                {"$set": {"status": "suspended"}}
            )
            suspended_count += 1
    
    # Reset monthly volumes
    await db.users.update_many(
        {"access_level": {"$in": [3, 4]}},
        {"$set": {"personal_volume": 0, "team_volume": 0}}
    )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "qualifications_checked",
        "user_id": user["user_id"],
        "details": {"suspended": suspended_count, "cancelled": cancelled_count},
        "created_at": now.isoformat()
    })
    
    return {"message": f"Suspended: {suspended_count}, Cancelled: {cancelled_count}"}

# ==================== RANKING & LEADERBOARD ====================

@app.get("/api/ranking/resellers")
async def get_reseller_ranking(
    request: Request,
    period: str = Query("month", enum=["week", "month", "quarter", "year", "all"]),
    metric: str = Query("sales", enum=["sales", "commissions", "network", "points"]),
    limit: int = Query(10, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """Get reseller ranking by various metrics"""
    db = request.app.db
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0).isoformat()
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start_date = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0).isoformat()
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0).isoformat()
    else:
        start_date = None
    
    if metric == "sales":
        # Ranking by sales volume
        match_stage = {"referrer_id": {"$ne": None}, "payment_status": "paid"}
        if start_date:
            match_stage["created_at"] = {"$gte": start_date}
        
        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": "$referrer_id",
                "total_sales": {"$sum": "$total"},
                "order_count": {"$sum": 1}
            }},
            {"$sort": {"total_sales": -1}},
            {"$limit": limit}
        ]
        results = await db.orders.aggregate(pipeline).to_list(limit)
        
    elif metric == "commissions":
        # Ranking by commissions earned
        match_stage = {}
        if start_date:
            match_stage["created_at"] = {"$gte": start_date}
        
        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": "$user_id",
                "total_commissions": {"$sum": "$amount"},
                "commission_count": {"$sum": 1}
            }},
            {"$sort": {"total_commissions": -1}},
            {"$limit": limit}
        ]
        results = await db.commissions.aggregate(pipeline).to_list(limit)
        
    elif metric == "network":
        # Ranking by network size
        pipeline = [
            {"$match": {"access_level": {"$in": [3, 4]}, "status": "active"}},
            {"$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "sponsor_id",
                "as": "direct_referrals"
            }},
            {"$addFields": {"network_size": {"$size": "$direct_referrals"}}},
            {"$sort": {"network_size": -1}},
            {"$limit": limit},
            {"$project": {"_id": 0, "user_id": 1, "name": 1, "network_size": 1, "access_level": 1}}
        ]
        results = await db.users.aggregate(pipeline).to_list(limit)
        
        return {"ranking": results, "period": period, "metric": metric}
    
    else:  # points
        # Ranking by points
        results = await db.users.find(
            {"access_level": {"$in": [3, 4]}, "status": "active"},
            {"_id": 0, "user_id": 1, "name": 1, "points": 1, "access_level": 1}
        ).sort("points", -1).limit(limit).to_list(limit)
        
        return {"ranking": results, "period": period, "metric": metric}
    
    # Enrich with user data for sales/commissions
    enriched = []
    for idx, item in enumerate(results):
        user_data = await db.users.find_one(
            {"user_id": item["_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "access_level": 1, "picture": 1}
        )
        if user_data:
            enriched.append({
                "rank": idx + 1,
                **user_data,
                **{k: v for k, v in item.items() if k != "_id"}
            })
    
    return {"ranking": enriched, "period": period, "metric": metric}

# ==================== GOALS & BONUSES ====================

class GoalCreate(BaseModel):
    name: str
    description: Optional[str] = None
    metric: str  # sales, commissions, network, personal_volume
    target_value: float
    bonus_amount: float
    bonus_type: str = "fixed"  # fixed, percentage
    start_date: str
    end_date: str
    access_levels: List[int] = [3, 4]  # Who can participate
    active: bool = True

@app.post("/api/goals")
async def create_goal(request: Request, data: GoalCreate, user: dict = Depends(require_access_level(1))):
    """Create a new goal/target"""
    db = request.app.db
    
    goal = {
        "goal_id": generate_id("goal_"),
        **data.model_dump(),
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.goals.insert_one(goal)
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "goal_created",
        "user_id": user["user_id"],
        "details": {"goal_id": goal["goal_id"], "name": data.name},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    goal_response = await db.goals.find_one({"goal_id": goal["goal_id"]}, {"_id": 0})
    return goal_response

@app.get("/api/goals")
async def list_goals(
    request: Request,
    active_only: bool = True,
    user: dict = Depends(get_current_user)
):
    """List goals available for the user"""
    db = request.app.db
    
    query = {"access_levels": user.get("access_level")}
    if active_only:
        now = datetime.now(timezone.utc).isoformat()
        query["active"] = True
        query["end_date"] = {"$gte": now}
    
    goals = await db.goals.find(query, {"_id": 0}).to_list(100)
    
    # Calculate progress for each goal
    for goal in goals:
        progress = await calculate_goal_progress(db, user["user_id"], goal)
        goal["progress"] = progress
    
    return {"goals": goals}

@app.get("/api/goals/{goal_id}")
async def get_goal(request: Request, goal_id: str, user: dict = Depends(get_current_user)):
    """Get goal details with user progress"""
    db = request.app.db
    
    goal = await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal["progress"] = await calculate_goal_progress(db, user["user_id"], goal)
    
    return goal

@app.put("/api/goals/{goal_id}")
async def update_goal(request: Request, goal_id: str, data: GoalCreate, user: dict = Depends(require_access_level(1))):
    """Update a goal"""
    db = request.app.db
    
    existing = await db.goals.find_one({"goal_id": goal_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["user_id"]
    
    await db.goals.update_one({"goal_id": goal_id}, {"$set": update_data})
    
    updated = await db.goals.find_one({"goal_id": goal_id}, {"_id": 0})
    return updated

@app.delete("/api/goals/{goal_id}")
async def delete_goal(request: Request, goal_id: str, user: dict = Depends(require_access_level(1))):
    """Delete a goal"""
    db = request.app.db
    
    result = await db.goals.delete_one({"goal_id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return {"message": "Goal deleted"}

async def calculate_goal_progress(db, user_id: str, goal: dict) -> dict:
    """Calculate user progress towards a goal"""
    metric = goal.get("metric")
    target = goal.get("target_value", 0)
    start_date = goal.get("start_date")
    end_date = goal.get("end_date")
    
    current_value = 0
    
    if metric == "sales":
        result = await db.orders.aggregate([
            {"$match": {
                "referrer_id": user_id,
                "payment_status": "paid",
                "created_at": {"$gte": start_date, "$lte": end_date}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]).to_list(1)
        current_value = result[0]["total"] if result else 0
        
    elif metric == "commissions":
        result = await db.commissions.aggregate([
            {"$match": {
                "user_id": user_id,
                "created_at": {"$gte": start_date, "$lte": end_date}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        current_value = result[0]["total"] if result else 0
        
    elif metric == "network":
        current_value = await db.users.count_documents({
            "sponsor_id": user_id,
            "access_level": {"$in": [3, 4]},
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
    elif metric == "personal_volume":
        user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        current_value = user_data.get("personal_volume", 0) if user_data else 0
    
    percentage = min((current_value / target * 100) if target > 0 else 0, 100)
    completed = current_value >= target
    
    return {
        "current_value": current_value,
        "target_value": target,
        "percentage": round(percentage, 1),
        "completed": completed,
        "remaining": max(target - current_value, 0)
    }

@app.get("/api/goals/achievements/{user_id}")
async def get_user_achievements(request: Request, user_id: str, user: dict = Depends(get_current_user)):
    """Get all achievements/completed goals for a user"""
    db = request.app.db
    
    # Check access
    if user["user_id"] != user_id and user.get("access_level") > 2:
        raise HTTPException(status_code=403, detail="Access denied")
    
    achievements = await db.achievements.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("achieved_at", -1).to_list(100)
    
    return {"achievements": achievements}

@app.post("/api/admin/process-goals")
async def process_goal_achievements(request: Request, user: dict = Depends(require_access_level(0))):
    """Process goal achievements and award bonuses"""
    db = request.app.db
    
    now = datetime.now(timezone.utc)
    now_str = now.isoformat()
    
    # Get active goals that ended
    ended_goals = await db.goals.find({
        "active": True,
        "end_date": {"$lte": now_str}
    }, {"_id": 0}).to_list(100)
    
    achievements_created = 0
    bonuses_awarded = 0
    
    for goal in ended_goals:
        # Get all eligible users
        eligible_users = await db.users.find({
            "access_level": {"$in": goal.get("access_levels", [3, 4])},
            "status": "active"
        }, {"_id": 0}).to_list(10000)
        
        for eligible_user in eligible_users:
            # Check if already processed
            existing = await db.achievements.find_one({
                "goal_id": goal["goal_id"],
                "user_id": eligible_user["user_id"]
            })
            
            if existing:
                continue
            
            # Calculate progress
            progress = await calculate_goal_progress(db, eligible_user["user_id"], goal)
            
            if progress["completed"]:
                # Create achievement
                achievement = {
                    "achievement_id": generate_id("ach_"),
                    "goal_id": goal["goal_id"],
                    "goal_name": goal["name"],
                    "user_id": eligible_user["user_id"],
                    "final_value": progress["current_value"],
                    "target_value": progress["target_value"],
                    "achieved_at": now_str
                }
                await db.achievements.insert_one(achievement)
                achievements_created += 1
                
                # Award bonus
                bonus_amount = goal.get("bonus_amount", 0)
                if goal.get("bonus_type") == "percentage":
                    bonus_amount = progress["current_value"] * (bonus_amount / 100)
                
                if bonus_amount > 0:
                    await db.users.update_one(
                        {"user_id": eligible_user["user_id"]},
                        {
                            "$inc": {"available_balance": bonus_amount, "points": int(bonus_amount)},
                        }
                    )
                    
                    await db.transactions.insert_one({
                        "transaction_id": generate_id("tx_"),
                        "user_id": eligible_user["user_id"],
                        "type": "goal_bonus",
                        "amount": bonus_amount,
                        "reference_id": goal["goal_id"],
                        "description": f"Bônus por meta: {goal['name']}",
                        "created_at": now_str
                    })
                    bonuses_awarded += 1
        
        # Mark goal as processed
        await db.goals.update_one(
            {"goal_id": goal["goal_id"]},
            {"$set": {"processed": True, "processed_at": now_str}}
        )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "goals_processed",
        "user_id": user["user_id"],
        "details": {"achievements": achievements_created, "bonuses": bonuses_awarded},
        "created_at": now_str
    })
    
    return {"achievements_created": achievements_created, "bonuses_awarded": bonuses_awarded}

# ==================== REFERRAL LINKS & TRACKING ====================

@app.get("/api/referral/link")
async def get_referral_link(request: Request, user: dict = Depends(get_current_user)):
    """Get user's referral link with stats"""
    db = request.app.db
    
    base_url = request.headers.get("origin", "https://vanguard.com")
    referral_code = user.get("referral_code")
    
    # Get referral stats
    total_clicks = await db.referral_clicks.count_documents({"referral_code": referral_code})
    
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
    monthly_clicks = await db.referral_clicks.count_documents({
        "referral_code": referral_code,
        "created_at": {"$gte": month_start}
    })
    
    # Conversions (orders with this referral)
    total_conversions = await db.orders.count_documents({
        "referrer_id": user["user_id"],
        "payment_status": "paid"
    })
    
    monthly_conversions = await db.orders.count_documents({
        "referrer_id": user["user_id"],
        "payment_status": "paid",
        "created_at": {"$gte": month_start}
    })
    
    conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    
    return {
        "referral_code": referral_code,
        "referral_link": f"{base_url}/store?ref={referral_code}",
        "stats": {
            "total_clicks": total_clicks,
            "monthly_clicks": monthly_clicks,
            "total_conversions": total_conversions,
            "monthly_conversions": monthly_conversions,
            "conversion_rate": round(conversion_rate, 2)
        }
    }

@app.post("/api/referral/track")
async def track_referral_click(request: Request):
    """Track a referral link click (called from frontend)"""
    db = request.app.db
    body = await request.json()
    
    referral_code = body.get("referral_code")
    if not referral_code:
        raise HTTPException(status_code=400, detail="Referral code required")
    
    # Verify code exists
    referrer = await db.users.find_one({"referral_code": referral_code})
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    # Record click
    click = {
        "click_id": generate_id("click_"),
        "referral_code": referral_code,
        "referrer_id": referrer["user_id"],
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referral_clicks.insert_one(click)
    
    return {"tracked": True, "referrer_name": referrer.get("name")}

@app.get("/api/referral/clicks")
async def get_referral_clicks(
    request: Request,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get referral click history"""
    db = request.app.db
    
    query = {"referrer_id": user["user_id"]}
    
    total = await db.referral_clicks.count_documents(query)
    clicks = await db.referral_clicks.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    return {"clicks": clicks, "total": total, "page": page}

# ==================== EXPORT REPORTS ====================

@app.get("/api/export/sales")
async def export_sales_report(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    format: str = Query("csv", enum=["csv", "json"]),
    user: dict = Depends(require_access_level(1))
):
    """Export sales report"""
    db = request.app.db
    
    query = {"payment_status": "paid"}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    if format == "json":
        return {"orders": orders, "total_count": len(orders)}
    
    # CSV format
    import io
    output = io.StringIO()
    
    headers = ["order_id", "created_at", "user_id", "subtotal", "shipping", "total", "payment_status", "order_status", "referrer_id"]
    output.write(",".join(headers) + "\n")
    
    for order in orders:
        row = [str(order.get(h, "")) for h in headers]
        output.write(",".join(row) + "\n")
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sales_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@app.get("/api/export/commissions")
async def export_commissions_report(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    format: str = Query("csv", enum=["csv", "json"]),
    user: dict = Depends(require_access_level(1))
):
    """Export commissions report"""
    db = request.app.db
    
    query = {}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date
    
    commissions = await db.commissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    # Enrich with user names
    for comm in commissions:
        user_data = await db.users.find_one({"user_id": comm["user_id"]}, {"name": 1, "email": 1})
        if user_data:
            comm["user_name"] = user_data.get("name")
            comm["user_email"] = user_data.get("email")
    
    if format == "json":
        return {"commissions": commissions, "total_count": len(commissions)}
    
    import io
    output = io.StringIO()
    
    headers = ["commission_id", "created_at", "user_id", "user_name", "user_email", "order_id", "level", "rate", "base_amount", "amount", "status"]
    output.write(",".join(headers) + "\n")
    
    for comm in commissions:
        row = [str(comm.get(h, "")) for h in headers]
        output.write(",".join(row) + "\n")
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=commissions_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@app.get("/api/export/users")
async def export_users_report(
    request: Request,
    access_level: Optional[int] = None,
    status: Optional[str] = None,
    format: str = Query("csv", enum=["csv", "json"]),
    user: dict = Depends(require_access_level(1))
):
    """Export users report"""
    db = request.app.db
    
    query = {}
    if access_level is not None:
        query["access_level"] = access_level
    if status:
        query["status"] = status
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(10000)
    
    if format == "json":
        return {"users": users, "total_count": len(users)}
    
    import io
    output = io.StringIO()
    
    headers = ["user_id", "name", "email", "phone", "access_level", "status", "referral_code", "sponsor_id", "created_at", "personal_volume", "team_volume", "available_balance", "blocked_balance", "points"]
    output.write(",".join(headers) + "\n")
    
    for u in users:
        row = [str(u.get(h, "")) for h in headers]
        output.write(",".join(row) + "\n")
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=users_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@app.get("/api/export/network/{user_id}")
async def export_network_report(
    request: Request,
    user_id: str,
    format: str = Query("csv", enum=["csv", "json"]),
    user: dict = Depends(get_current_user)
):
    """Export network/downline report for a user"""
    db = request.app.db
    
    # Check access
    if user["user_id"] != user_id and user.get("access_level") > 2:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all downline (3 levels)
    async def get_downline(sponsor_id: str, level: int = 1, max_level: int = 3):
        if level > max_level:
            return []
        
        direct = await db.users.find(
            {"sponsor_id": sponsor_id, "access_level": {"$in": [3, 4]}},
            {"_id": 0, "password": 0}
        ).to_list(1000)
        
        result = []
        for d in direct:
            d["network_level"] = level
            result.append(d)
            result.extend(await get_downline(d["user_id"], level + 1, max_level))
        
        return result
    
    network = await get_downline(user_id)
    
    if format == "json":
        return {"network": network, "total_count": len(network)}
    
    import io
    output = io.StringIO()
    
    headers = ["network_level", "user_id", "name", "email", "access_level", "status", "personal_volume", "team_volume", "created_at"]
    output.write(",".join(headers) + "\n")
    
    for n in network:
        row = [str(n.get(h, "")) for h in headers]
        output.write(",".join(row) + "\n")
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=network_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ==================== DASHBOARD PER ACCESS LEVEL ====================

@app.get("/api/dashboard/supervisor")
async def supervisor_dashboard(request: Request, user: dict = Depends(require_access_level(2))):
    """Dashboard for Supervisor (Level 2)"""
    db = request.app.db
    
    # Get assigned resellers or all if none assigned
    assigned_ids = user.get("assigned_resellers", [])
    reseller_query = {"access_level": 4}
    if assigned_ids:
        reseller_query["user_id"] = {"$in": assigned_ids}
    
    # Reseller stats
    total_resellers = await db.users.count_documents(reseller_query)
    active_resellers = await db.users.count_documents({**reseller_query, "status": "active"})
    suspended_resellers = await db.users.count_documents({**reseller_query, "status": "suspended"})
    
    # This month orders from resellers
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
    
    if assigned_ids:
        orders_query = {"referrer_id": {"$in": assigned_ids}, "created_at": {"$gte": month_start}, "payment_status": "paid"}
    else:
        orders_query = {"created_at": {"$gte": month_start}, "payment_status": "paid"}
    
    orders_this_month = await db.orders.aggregate([
        {"$match": orders_query},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # Top performing resellers
    top_resellers = await db.orders.aggregate([
        {"$match": {**orders_query, "referrer_id": {"$ne": None}}},
        {"$group": {"_id": "$referrer_id", "total_sales": {"$sum": "$total"}}},
        {"$sort": {"total_sales": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    for tr in top_resellers:
        user_data = await db.users.find_one({"user_id": tr["_id"]}, {"_id": 0, "name": 1, "email": 1})
        if user_data:
            tr["name"] = user_data.get("name")
            tr["email"] = user_data.get("email")
    
    # Recent activity
    recent_orders = await db.orders.find(
        orders_query,
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "resellers": {
            "total": total_resellers,
            "active": active_resellers,
            "suspended": suspended_resellers
        },
        "orders_this_month": {
            "total": orders_this_month[0]["total"] if orders_this_month else 0,
            "count": orders_this_month[0]["count"] if orders_this_month else 0
        },
        "top_resellers": top_resellers,
        "recent_orders": recent_orders
    }

@app.get("/api/dashboard/leader")
async def leader_dashboard(request: Request, user: dict = Depends(get_current_user)):
    """Dashboard for Team Leader (Level 3)"""
    db = request.app.db
    user_id = user["user_id"]
    
    if user.get("access_level") > 3:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Team stats (direct + indirect)
    direct_count = await db.users.count_documents({"sponsor_id": user_id, "access_level": {"$in": [3, 4]}})
    
    # Get indirect (level 2 and 3)
    direct_ids = [u["user_id"] for u in await db.users.find({"sponsor_id": user_id}, {"user_id": 1}).to_list(100)]
    level_2_count = await db.users.count_documents({"sponsor_id": {"$in": direct_ids}, "access_level": {"$in": [3, 4]}}) if direct_ids else 0
    
    level_2_ids = [u["user_id"] for u in await db.users.find({"sponsor_id": {"$in": direct_ids}}, {"user_id": 1}).to_list(100)] if direct_ids else []
    level_3_count = await db.users.count_documents({"sponsor_id": {"$in": level_2_ids}, "access_level": {"$in": [3, 4]}}) if level_2_ids else 0
    
    # Team sales this month
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
    all_team_ids = [user_id] + direct_ids + level_2_ids
    
    team_sales = await db.orders.aggregate([
        {"$match": {"referrer_id": {"$in": all_team_ids}, "created_at": {"$gte": month_start}, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # My commissions
    my_commissions = await db.commissions.aggregate([
        {"$match": {"user_id": user_id, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": "$status", "total": {"$sum": "$amount"}}}
    ]).to_list(10)
    
    commissions_by_status = {c["_id"]: c["total"] for c in my_commissions}
    
    # Top team members
    top_team = await db.orders.aggregate([
        {"$match": {"referrer_id": {"$in": direct_ids}, "created_at": {"$gte": month_start}, "payment_status": "paid"}},
        {"$group": {"_id": "$referrer_id", "total_sales": {"$sum": "$total"}}},
        {"$sort": {"total_sales": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    for tt in top_team:
        user_data = await db.users.find_one({"user_id": tt["_id"]}, {"_id": 0, "name": 1})
        if user_data:
            tt["name"] = user_data.get("name")
    
    return {
        "team": {
            "level_1": direct_count,
            "level_2": level_2_count,
            "level_3": level_3_count,
            "total": direct_count + level_2_count + level_3_count
        },
        "team_sales": {
            "total": team_sales[0]["total"] if team_sales else 0,
            "count": team_sales[0]["count"] if team_sales else 0
        },
        "commissions": {
            "available": commissions_by_status.get("available", 0),
            "blocked": commissions_by_status.get("blocked", 0)
        },
        "top_team": top_team,
        "available_balance": user.get("available_balance", 0),
        "blocked_balance": user.get("blocked_balance", 0),
        "referral_code": user.get("referral_code")
    }

@app.get("/api/dashboard/client")
async def client_dashboard(request: Request, user: dict = Depends(get_current_user)):
    """Dashboard for Client (Level 5) and Ambassador (Level 6)"""
    db = request.app.db
    user_id = user["user_id"]
    
    # My orders
    orders_count = await db.orders.count_documents({"user_id": user_id})
    orders_total = await db.orders.aggregate([
        {"$match": {"user_id": user_id, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(1)
    
    # Recent orders
    recent_orders = await db.orders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Referral stats (if client has any)
    referral_sales = await db.orders.aggregate([
        {"$match": {"referrer_id": user_id, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    
    # Commissions earned
    commissions = await db.commissions.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$status", "total": {"$sum": "$amount"}}}
    ]).to_list(10)
    
    commissions_by_status = {c["_id"]: c["total"] for c in commissions}
    
    return {
        "orders": {
            "count": orders_count,
            "total_spent": orders_total[0]["total"] if orders_total else 0
        },
        "recent_orders": recent_orders,
        "referrals": {
            "sales": referral_sales[0]["total"] if referral_sales else 0,
            "count": referral_sales[0]["count"] if referral_sales else 0
        },
        "commissions": {
            "available": commissions_by_status.get("available", 0),
            "blocked": commissions_by_status.get("blocked", 0)
        },
        "available_balance": user.get("available_balance", 0),
        "referral_code": user.get("referral_code")
    }

# ==================== SCHEDULER STATUS ====================

@app.get("/api/admin/scheduler-status")
async def get_scheduler_status(request: Request, user: dict = Depends(require_access_level(0))):
    """Get status of scheduled jobs"""
    db = request.app.db
    
    # Get last run times from logs
    last_qualification = await db.logs.find_one(
        {"action": {"$in": ["qualifications_checked", "scheduled_qualifications_checked"]}},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    last_commission_release = await db.logs.find_one(
        {"action": {"$in": ["commissions_released", "scheduled_commissions_released"]}},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    last_goals_process = await db.logs.find_one(
        {"action": "goals_processed"},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    # Pending items
    pending_commissions = await db.commissions.count_documents({"status": "blocked"})
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    active_goals = await db.goals.count_documents({"active": True, "processed": {"$ne": True}})
    
    # Scheduler jobs info
    jobs_info = []
    for job in scheduler.get_jobs():
        jobs_info.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    return {
        "scheduler_running": scheduler.running,
        "jobs": jobs_info,
        "last_runs": {
            "qualification_check": last_qualification.get("created_at") if last_qualification else None,
            "commission_release": last_commission_release.get("created_at") if last_commission_release else None,
            "goals_processing": last_goals_process.get("created_at") if last_goals_process else None
        },
        "pending": {
            "commissions_to_release": pending_commissions,
            "withdrawals_to_process": pending_withdrawals,
            "goals_to_process": active_goals
        }
    }

@app.post("/api/admin/run-job/{job_id}")
async def run_job_manually(request: Request, job_id: str, user: dict = Depends(require_access_level(0))):
    """Manually trigger a scheduled job"""
    db = request.app.db
    
    if job_id == "release_commissions":
        await release_commissions_job(db)
        return {"message": "Commission release job executed"}
    elif job_id == "check_qualifications":
        await check_qualifications_job(db)
        return {"message": "Qualification check job executed"}
    else:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

# ==================== IN-APP NOTIFICATIONS ====================

@app.get("/api/notifications")
async def get_notifications(request: Request, user: dict = Depends(get_current_user), limit: int = 50):
    """Get user's in-app notifications"""
    db = request.app.db
    
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unread_count = await db.notifications.count_documents({
        "user_id": user["user_id"],
        "read": False
    })
    
    return {"notifications": notifications, "unread_count": unread_count}

@app.get("/api/notifications/unread-count")
async def get_unread_count(request: Request, user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    db = request.app.db
    
    count = await db.notifications.count_documents({
        "user_id": user["user_id"],
        "read": False
    })
    
    return {"count": count}

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(request: Request, notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    db = request.app.db
    
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Notification marked as read"}

@app.post("/api/notifications/read-all")
async def mark_all_notifications_read(request: Request, user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    db = request.app.db
    
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "All notifications marked as read"}

async def create_notification(db, user_id: str, title: str, body: str, notification_type: str = "system", data: dict = None):
    """Create an in-app notification"""
    notification = {
        "notification_id": generate_id("notif_"),
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": notification_type,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    return notification

# ==================== SUPPORT TICKETS ====================

class TicketCreate(BaseModel):
    category: str  # Financeiro, Produto, Rede, Técnico, Outros
    subject: str
    description: str
    priority: str = "normal"  # baixa, normal, alta, urgente

class TicketReply(BaseModel):
    message: str

@app.post("/api/tickets")
async def create_ticket(request: Request, data: TicketCreate, user: dict = Depends(get_current_user)):
    """Create a new support ticket - All users can create tickets"""
    db = request.app.db
    
    ticket = {
        "ticket_id": generate_id("ticket_"),
        "user_id": user["user_id"],
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "category": data.category,
        "subject": data.subject,
        "description": data.description,
        "priority": data.priority,
        "status": "open",  # open, in_progress, resolved, closed
        "assigned_to": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tickets.insert_one(ticket)
    
    # Create notification for admins/supervisors
    admins_and_supervisors = await db.users.find(
        {"access_level": {"$in": [0, 1, 2]}, "status": "active"},
        {"_id": 0, "user_id": 1}
    ).to_list(100)
    
    for admin in admins_and_supervisors:
        await create_notification(
            db,
            admin["user_id"],
            "Novo Ticket de Suporte 🎫",
            f"Novo ticket de {user.get('name')}: {data.subject}",
            "ticket",
            {"url": f"/support/{ticket['ticket_id']}", "ticket_id": ticket["ticket_id"]}
        )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "ticket_created",
        "user_id": user["user_id"],
        "details": {"ticket_id": ticket["ticket_id"], "subject": data.subject, "category": data.category},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    ticket_response = await db.tickets.find_one({"ticket_id": ticket["ticket_id"]}, {"_id": 0})
    return ticket_response

@app.get("/api/tickets")
async def list_tickets(
    request: Request,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """List tickets - Users see their own, admins/supervisors see all"""
    db = request.app.db
    
    query = {}
    
    # Regular users only see their own tickets
    if user.get("access_level") > 2:
        query["user_id"] = user["user_id"]
    
    # Filters
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    
    total = await db.tickets.count_documents(query)
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    # Add reply count to each ticket
    for ticket in tickets:
        reply_count = await db.ticket_replies.count_documents({"ticket_id": ticket["ticket_id"]})
        ticket["reply_count"] = reply_count
    
    return {
        "tickets": tickets,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/tickets/{ticket_id}")
async def get_ticket(request: Request, ticket_id: str, user: dict = Depends(get_current_user)):
    """Get ticket details with replies"""
    db = request.app.db
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access - users can only see their own tickets, admins/supervisors can see all
    if user.get("access_level") > 2 and ticket["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get replies
    replies = await db.ticket_replies.find(
        {"ticket_id": ticket_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Enrich replies with user names
    for reply in replies:
        reply_user = await db.users.find_one({"user_id": reply["user_id"]}, {"_id": 0, "name": 1, "access_level": 1})
        if reply_user:
            reply["user_name"] = reply_user.get("name")
            reply["user_access_level"] = reply_user.get("access_level")
    
    ticket["replies"] = replies
    
    return ticket

@app.post("/api/tickets/{ticket_id}/reply")
async def reply_to_ticket(request: Request, ticket_id: str, data: TicketReply, user: dict = Depends(get_current_user)):
    """Reply to a ticket - Admins/Supervisors can reply, ticket owner can also reply"""
    db = request.app.db
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permissions: admins/supervisors can reply, or the ticket owner
    is_staff = user.get("access_level") <= 2
    is_owner = ticket["user_id"] == user["user_id"]
    
    if not is_staff and not is_owner:
        raise HTTPException(status_code=403, detail="You cannot reply to this ticket")
    
    reply = {
        "reply_id": generate_id("reply_"),
        "ticket_id": ticket_id,
        "user_id": user["user_id"],
        "message": data.message,
        "is_staff": is_staff,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ticket_replies.insert_one(reply)
    
    # Update ticket status and timestamp
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if is_staff and ticket["status"] == "open":
        update_data["status"] = "in_progress"
        update_data["assigned_to"] = user["user_id"]
    
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": update_data})
    
    # Notify the other party
    if is_staff:
        # Staff replied, notify ticket owner
        await create_notification(
            db,
            ticket["user_id"],
            "Nova Resposta no seu Ticket 💬",
            f"Sua solicitação '{ticket['subject']}' recebeu uma resposta!",
            "ticket_reply",
            {"url": f"/support/{ticket_id}", "ticket_id": ticket_id}
        )
        await send_push_notification(
            db,
            ticket["user_id"],
            "Nova Resposta no seu Ticket 💬",
            f"Sua solicitação '{ticket['subject']}' recebeu uma resposta!",
            {"url": f"/support/{ticket_id}", "type": "ticket_reply"}
        )
    else:
        # Ticket owner replied, notify staff
        admins_and_supervisors = await db.users.find(
            {"access_level": {"$in": [0, 1, 2]}, "status": "active"},
            {"_id": 0, "user_id": 1}
        ).to_list(100)
        
        for admin in admins_and_supervisors:
            await create_notification(
                db,
                admin["user_id"],
                "Nova Resposta em Ticket 💬",
                f"{user.get('name')} respondeu ao ticket: {ticket['subject']}",
                "ticket_reply",
                {"url": f"/support/{ticket_id}", "ticket_id": ticket_id}
            )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "ticket_replied",
        "user_id": user["user_id"],
        "details": {"ticket_id": ticket_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    reply_response = await db.ticket_replies.find_one({"reply_id": reply["reply_id"]}, {"_id": 0})
    return reply_response

@app.put("/api/tickets/{ticket_id}/status")
async def update_ticket_status(
    request: Request,
    ticket_id: str,
    status: str = Query(..., enum=["open", "in_progress", "resolved", "closed"]),
    user: dict = Depends(get_current_user)
):
    """Update ticket status - Admins/Supervisors only"""
    db = request.app.db
    
    # Only admins/supervisors can update status
    if user.get("access_level") > 2:
        raise HTTPException(status_code=403, detail="Only staff can update ticket status")
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    await db.tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify ticket owner
    await create_notification(
        db,
        ticket["user_id"],
        "Status do Ticket Atualizado 📋",
        f"Seu ticket '{ticket['subject']}' foi atualizado para: {status}",
        "ticket_status",
        {"url": f"/support/{ticket_id}", "ticket_id": ticket_id}
    )
    
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "ticket_status_updated",
        "user_id": user["user_id"],
        "details": {"ticket_id": ticket_id, "new_status": status},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Ticket status updated"}

@app.get("/api/tickets/stats/summary")
async def get_tickets_summary(request: Request, user: dict = Depends(require_access_level(2))):
    """Get tickets summary statistics - Admins/Supervisors only"""
    db = request.app.db
    
    total_tickets = await db.tickets.count_documents({})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    in_progress = await db.tickets.count_documents({"status": "in_progress"})
    resolved = await db.tickets.count_documents({"status": "resolved"})
    
    # By category
    by_category = {}
    for category in ["Financeiro", "Produto", "Rede", "Técnico", "Outros"]:
        count = await db.tickets.count_documents({"category": category})
        by_category[category] = count
    
    # Recent tickets
    recent = await db.tickets.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total": total_tickets,
        "by_status": {
            "open": open_tickets,
            "in_progress": in_progress,
            "resolved": resolved
        },
        "by_category": by_category,
        "recent_tickets": recent
    }

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check(request: Request):
    try:
        await request.app.db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

# ==================== WEBSOCKET CHAT ====================

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set

# Connection manager for WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected to WebSocket")
    
    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to {user_id}: {e}")
    
    async def broadcast_to_conversation(self, conversation_id: str, message: dict, db):
        """Send message to all participants in a conversation"""
        conversation = await db.conversations.find_one({"conversation_id": conversation_id})
        if conversation:
            for participant_id in conversation.get("participants", []):
                await self.send_personal_message(participant_id, message)

manager = ConnectionManager()

class ConversationCreate(BaseModel):
    participant_id: str  # Who to start conversation with
    message: str  # Initial message

@app.post("/api/chat/conversations")
async def create_conversation(request: Request, data: ConversationCreate, user: dict = Depends(get_current_user)):
    """Start a new conversation"""
    db = request.app.db
    
    # Get participant
    participant = await db.users.find_one({"user_id": data.participant_id}, {"_id": 0})
    if not participant:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    user_level = user.get("access_level")
    participant_level = participant.get("access_level")
    
    # Revendedor/Líder can only talk to their supervisor
    if user_level in [3, 4]:
        if participant_id := user.get("supervisor_id"):
            if data.participant_id != participant_id:
                raise HTTPException(status_code=403, detail="You can only chat with your supervisor")
        else:
            raise HTTPException(status_code=400, detail="No supervisor assigned")
    
    # Embaixador can talk to any supervisor or admin
    if user_level == 6:
        if participant_level not in [0, 1, 2]:
            raise HTTPException(status_code=403, detail="Ambassadors can only chat with supervisors or admins")
    
    # Check if conversation already exists
    existing = await db.conversations.find_one({
        "participants": {"$all": [user["user_id"], data.participant_id]}
    })
    
    if existing:
        conversation_id = existing["conversation_id"]
    else:
        # Create new conversation
        conversation = {
            "conversation_id": generate_id("conv_"),
            "participants": [user["user_id"], data.participant_id],
            "participant_names": {
                user["user_id"]: user.get("name"),
                data.participant_id: participant.get("name")
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_message_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conversation)
        conversation_id = conversation["conversation_id"]
    
    # Send initial message
    message = {
        "message_id": generate_id("msg_"),
        "conversation_id": conversation_id,
        "sender_id": user["user_id"],
        "content": data.message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message)
    
    # Update conversation last message
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"last_message_at": message["created_at"], "last_message": data.message}}
    )
    
    # Send via WebSocket
    await manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "new_message",
            "conversation_id": conversation_id,
            "message": message
        },
        db
    )
    
    # Create notification
    await create_notification(
        db,
        data.participant_id,
        f"Nova Mensagem de {user.get('name')} 💬",
        data.message[:100],
        "chat",
        {"url": f"/chat/{conversation_id}", "conversation_id": conversation_id}
    )
    
    return {"conversation_id": conversation_id, "message": message}

@app.get("/api/chat/conversations")
async def list_conversations(request: Request, user: dict = Depends(get_current_user)):
    """List all conversations for the user"""
    db = request.app.db
    
    conversations = await db.conversations.find(
        {"participants": user["user_id"]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    # Add unread count for each conversation
    for conv in conversations:
        unread = await db.messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": user["user_id"]},
            "read": False
        })
        conv["unread_count"] = unread
        
        # Get other participant info
        other_id = [p for p in conv["participants"] if p != user["user_id"]][0]
        other_user = await db.users.find_one(
            {"user_id": other_id},
            {"_id": 0, "name": 1, "email": 1, "access_level": 1, "picture": 1}
        )
        conv["other_user"] = other_user
    
    return {"conversations": conversations}

@app.get("/api/chat/conversations/{conversation_id}")
async def get_conversation_messages(
    request: Request,
    conversation_id: str,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get messages from a conversation"""
    db = request.app.db
    
    # Check access
    conversation = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if user["user_id"] not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get messages
    total = await db.messages.count_documents({"conversation_id": conversation_id})
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    
    # Reverse to show oldest first
    messages.reverse()
    
    # Mark messages as read
    await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user["user_id"]},
            "read": False
        },
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "conversation": conversation,
        "messages": messages,
        "total": total,
        "page": page
    }

@app.post("/api/chat/conversations/{conversation_id}/message")
async def send_message(
    request: Request,
    conversation_id: str,
    message: str = Query(...),
    user: dict = Depends(get_current_user)
):
    """Send a message in a conversation"""
    db = request.app.db
    
    # Check access
    conversation = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if user["user_id"] not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create message
    msg = {
        "message_id": generate_id("msg_"),
        "conversation_id": conversation_id,
        "sender_id": user["user_id"],
        "content": message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(msg)
    
    # Update conversation
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"last_message_at": msg["created_at"], "last_message": message}}
    )
    
    # Send via WebSocket
    await manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "new_message",
            "conversation_id": conversation_id,
            "message": msg
        },
        db
    )
    
    # Notify other participant
    other_id = [p for p in conversation["participants"] if p != user["user_id"]][0]
    await create_notification(
        db,
        other_id,
        f"Nova Mensagem de {user.get('name')} 💬",
        message[:100],
        "chat",
        {"url": f"/chat/{conversation_id}", "conversation_id": conversation_id}
    )
    
    await send_push_notification(
        db,
        other_id,
        f"Nova Mensagem de {user.get('name')} 💬",
        message[:100],
        {"url": f"/chat/{conversation_id}", "type": "chat"}
    )
    
    msg_response = await db.messages.find_one({"message_id": msg["message_id"]}, {"_id": 0})
    return msg_response

@app.websocket("/ws/chat/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive and receive messages
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "typing":
                # Broadcast typing indicator to conversation
                conversation_id = data.get("conversation_id")
                if conversation_id:
                    db = app.db
                    await manager.broadcast_to_conversation(
                        conversation_id,
                        {
                            "type": "typing",
                            "user_id": user_id,
                            "conversation_id": conversation_id
                        },
                        db
                    )
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)

@app.get("/api/chat/contacts")
async def get_chat_contacts(request: Request, user: dict = Depends(get_current_user)):
    """Get list of users the current user can chat with"""
    db = request.app.db
    
    user_level = user.get("access_level")
    contacts = []
    
    # Revendedor/Líder - only their supervisor
    if user_level in [3, 4]:
        supervisor_id = user.get("supervisor_id")
        if supervisor_id:
            supervisor = await db.users.find_one(
                {"user_id": supervisor_id},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1, "access_level": 1, "picture": 1}
            )
            if supervisor:
                contacts.append(supervisor)
    
    # Embaixador - all supervisors and admins
    elif user_level == 6:
        staff = await db.users.find(
            {"access_level": {"$in": [0, 1, 2]}, "status": "active"},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "access_level": 1, "picture": 1}
        ).to_list(100)
        contacts.extend(staff)
    
    # Supervisor - their assigned users + admins
    elif user_level == 2:
        # Get supervised users
        supervised = await db.users.find(
            {"supervisor_id": user["user_id"], "status": "active"},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "access_level": 1, "picture": 1}
        ).to_list(100)
        contacts.extend(supervised)
        
        # Get admins
        admins = await db.users.find(
            {"access_level": {"$in": [0, 1]}, "status": "active"},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "access_level": 1, "picture": 1}
        ).to_list(100)
        contacts.extend(admins)
    
    # Admin - all users except themselves
    elif user_level <= 1:
        all_users = await db.users.find(
            {"user_id": {"$ne": user["user_id"]}, "status": "active"},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "access_level": 1, "picture": 1}
        ).sort("name", 1).to_list(1000)
        contacts.extend(all_users)
    
    return {"contacts": contacts}

# ==================== WEBSOCKET NOTIFICATIONS ====================

@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time notifications"""
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket notifications error for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)

async def send_realtime_notification(db, user_id: str, notification: dict):
    """Send notification via WebSocket if user is connected, fallback to push"""
    # Try WebSocket first
    await manager.send_personal_message(user_id, {
        "type": "notification",
        "notification": notification
    })
    
    # Always create in-app notification
    await create_notification(
        db,
        user_id,
        notification.get("title", ""),
        notification.get("body", ""),
        notification.get("notification_type", "system"),
        notification.get("data")
    )
    
    # Fallback to push notification if offline
    if user_id not in manager.active_connections:
        await send_push_notification(
            db,
            user_id,
            notification.get("title", ""),
            notification.get("body", ""),
            notification.get("data")
        )

# ==================== PUSH NOTIFICATIONS ====================

# VAPID keys for push notifications (generate your own for production)
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "your-private-key")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U")
VAPID_CLAIMS = {"sub": "mailto:admin@vanguard.com"}

class PushSubscription(BaseModel):
    subscription: dict

class PushUnsubscribe(BaseModel):
    endpoint: str

@app.post("/api/notifications/subscribe")
async def subscribe_to_notifications(request: Request, data: PushSubscription, user: dict = Depends(get_current_user)):
    """Subscribe a user to push notifications"""
    db = request.app.db
    
    subscription_data = {
        "user_id": user["user_id"],
        "endpoint": data.subscription.get("endpoint"),
        "keys": data.subscription.get("keys"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update or insert subscription
    await db.push_subscriptions.update_one(
        {"user_id": user["user_id"], "endpoint": subscription_data["endpoint"]},
        {"$set": subscription_data},
        upsert=True
    )
    
    # Log the subscription
    await db.logs.insert_one({
        "log_id": generate_id("log_"),
        "action": "push_subscribed",
        "user_id": user["user_id"],
        "details": {"endpoint": subscription_data["endpoint"][:50] + "..."},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Subscribed to notifications"}

@app.post("/api/notifications/unsubscribe")
async def unsubscribe_from_notifications(request: Request, data: PushUnsubscribe, user: dict = Depends(get_current_user)):
    """Unsubscribe a user from push notifications"""
    db = request.app.db
    
    await db.push_subscriptions.delete_one({
        "user_id": user["user_id"],
        "endpoint": data.endpoint
    })
    
    return {"message": "Unsubscribed from notifications"}

@app.get("/api/notifications/status")
async def get_notification_status(request: Request, user: dict = Depends(get_current_user)):
    """Check if user is subscribed to push notifications"""
    db = request.app.db
    
    subscription = await db.push_subscriptions.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "endpoint": 1}
    )
    
    return {
        "subscribed": subscription is not None,
        "vapid_public_key": VAPID_PUBLIC_KEY
    }

async def send_push_notification(db, user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to a user"""
    subscriptions = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(10)
    
    if not subscriptions:
        logger.info(f"No push subscriptions for user {user_id}")
        return
    
    payload = {
        "title": title,
        "body": body,
        "icon": "/icon-192x192.png",
        "badge": "/icon-72x72.png",
        "tag": f"vanguard-{datetime.now().timestamp()}",
        "data": data or {}
    }
    
    for sub in subscriptions:
        try:
            subscription_info = {
                "endpoint": sub["endpoint"],
                "keys": sub["keys"]
            }
            
            webpush(
                subscription_info=subscription_info,
                data=str(payload).replace("'", '"'),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
            logger.info(f"Push notification sent to user {user_id}")
        except WebPushException as e:
            logger.error(f"Push notification failed: {e}")
            # Remove invalid subscription
            if e.response and e.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
        except Exception as e:
            logger.error(f"Push notification error: {e}")

@app.post("/api/admin/send-notification")
async def send_admin_notification(request: Request, user: dict = Depends(require_access_level(0))):
    """Send a test notification (admin only)"""
    db = request.app.db
    body = await request.json()
    
    target_user_id = body.get("user_id", user["user_id"])
    title = body.get("title", "Teste de Notificação")
    message = body.get("body", "Esta é uma notificação de teste do Vanguard MLM!")
    
    await send_push_notification(db, target_user_id, title, message)
    
    return {"message": f"Notification sent to user {target_user_id}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
