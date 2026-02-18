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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv
import httpx

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
    
    yield
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

@app.put("/api/users/{user_id}")
async def update_user(request: Request, user_id: str, data: UserUpdate, user: dict = Depends(get_current_user)):
    db = request.app.db
    
    # Users can only update their own profile, unless admin
    if user["user_id"] != user_id and user.get("access_level") > 1:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user_id}, {"$set": update_data})
        
        await db.logs.insert_one({
            "log_id": generate_id("log_"),
            "action": "user_updated",
            "user_id": user_id,
            "by_user_id": user["user_id"],
            "details": update_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    return updated

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
    
    return product

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
    
    return order

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
    
    return withdrawal

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

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check(request: Request):
    try:
        await request.app.db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
