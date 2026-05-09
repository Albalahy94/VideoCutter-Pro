import React, { useState } from 'react';
import { MessageCircle, Mail, X, Send } from 'lucide-react';

export default function FloatingSupport() {
    const [isOpen, setIsOpen] = useState(false);
    const phoneNumber = "201067481561";
    const email = "sh.elbalahy@gmail.com";

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent('Hello VideoCutter Pro Support, I need help with...')}`;
    const mailUrl = `mailto:${email}?subject=VideoCutter Pro Support Request`;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 font-sans">
            {/* Action Menu */}
            {isOpen && (
                <div className="flex flex-col items-end gap-3 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Email Button */}
                    <a 
                        href={mailUrl}
                        className="group flex items-center gap-3 pr-2"
                    >
                        <span className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Email Support
                        </span>
                        <div className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95">
                            <Mail size={22} />
                        </div>
                    </a>

                    {/* WhatsApp Button */}
                    <a 
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 pr-2"
                    >
                        <span className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            WhatsApp Chat
                        </span>
                        <div className="w-12 h-12 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95">
                            <MessageCircle size={24} />
                        </div>
                    </a>
                </div>
            )}

            {/* Main Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${
                    isOpen ? 'bg-white text-black rotate-90' : 'bg-gradient-to-tr from-violet-600 to-blue-600 text-white'
                }`}
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
                
                {/* Notification Badge */}
                {!isOpen && (
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500 border-2 border-[#0A0A0B]"></span>
                    </span>
                )}
            </button>
        </div>
    );
}
