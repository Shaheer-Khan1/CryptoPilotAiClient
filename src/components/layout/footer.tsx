export function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center space-y-6">
          <div>
            <h3 className="text-2xl font-black">
              <span className="text-white">CRYPTOPILOT</span>{" "}
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">AI</span>
            </h3>
            <p className="text-slate-400 mt-2">
              AI-Powered Cryptocurrency Trading Platform
            </p>
          </div>
          
          <div className="border-t border-slate-800 pt-6">
            <p className="text-slate-400 text-sm">
              © 2024 CryptoPilot AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 