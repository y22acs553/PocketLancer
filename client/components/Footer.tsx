import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-800 text-white mt-auto">
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="flex flex-col md:flex-row justify-center gap-6 mb-6 text-sm">
                    <Link href="/terms">Terms</Link>
                    <Link href="/privacy">Privacy</Link>
                    <Link href="/freelancer/availability">For Freelancers</Link>
                </div>

                <p className="text-gray-400 text-sm">
                    © {new Date().getFullYear()} PocketLancer
                </p>
            </div>
        </footer>
    );
}