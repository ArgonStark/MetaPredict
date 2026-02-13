export function Footer() {
  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>
            <span className="text-gradient font-semibold">MetaPredict</span>
            {" \u2014 "}Built for Chainlink Convergence Hackathon 2025
          </p>
          <p className="text-center">
            Powered by{" "}
            <span className="text-cyan">Chainlink CRE</span>
            {" \u2022 "}
            <span className="text-accent">Base</span>
            {" \u2022 "}
            <span className="text-foreground">OpenRouter</span>
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/ArgonStark/MetaPredict"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://polymarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Polymarket
            </a>
            <a
              href="https://kalshi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Kalshi
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
