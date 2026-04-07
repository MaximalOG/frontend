import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm overflow-hidden">
              <img src="/NetherNodes.jpg" alt="NetherNodes logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-foreground">NetherNodes</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/support" className="hover:text-foreground transition-colors">Support</Link>
            <a href="https://discord.gg/Xa9Pv7nZWX" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Discord</a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NetherNodes Hosting. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
