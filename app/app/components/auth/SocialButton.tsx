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
            className="flex items-center justify-center w-full gap-2 px-4 py-2 border border-base-300 rounded-lg shadow-sm bg-base-100 text-sm font-medium text-base-content hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all mt-4"
        >
            {Icon && <Icon className="w-5 h-5" />}
            {label}
        </button>
    );
}
