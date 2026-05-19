import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import "./globals.css";
import { ThemeProvider } from "@mui/material/styles";
import { Roboto } from "next/font/google";
import MainContainer from "@/containers/MainContainer";
import { AuthProvider } from "@/contexts/AuthContext";
import theme from "../theme";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata = {
  title: "MyDB",
  description: "MyDB by LIneA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable}>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-J2ZCP6CT0E" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-J2ZCP6CT0E');
            `
          }}
        />
      </head>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <AuthProvider>
              <MainContainer>{children}</MainContainer>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
