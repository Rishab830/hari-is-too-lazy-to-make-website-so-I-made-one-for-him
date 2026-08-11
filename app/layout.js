import "./globals.css";

export const metadata = {
  title: "The Hari Herald",
  description: "A clean newspaper-style article website."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
