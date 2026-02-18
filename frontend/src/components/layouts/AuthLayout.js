import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="py-6 px-4">
        <Link to="/" className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <span className="font-heading font-bold text-primary-main text-2xl">Vanguard</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading font-bold text-2xl text-primary-main mb-2">{title}</h1>
            {subtitle && <p className="text-slate-500">{subtitle}</p>}
          </div>
          
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-500">
        &copy; {new Date().getFullYear()} Vanguard MLM. Todos os direitos reservados.
      </footer>
    </div>
  );
}
