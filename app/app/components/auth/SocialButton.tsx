import { FcGoogle } from "react-icons/fc";

interface SocialButtonProps {
    provider: 'google';
    onClick: () => void;
}

export default function SocialButton({ provider, onClick }: SocialButtonProps) {
    const label = provider === 'google' ? 'Continue with Google' : 'Continue with Social';
    const Icon = provider === 'google' ? FcGoogle : null;

    return (
        <button
            type="button"
            onClick={onClick}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-[rgb(68,13,156)] focus:ring-offset-2"
        >
            {Icon && <Icon className="w-5 h-5" />}
            {label}
        </button>
    );
}
