import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { MeshProvider, useWallet } from "@meshsdk/react";
import PageWrapper from '@/components/layout/PageWrapper';
import type { NextComponentType, NextPageContext } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";

type CustomAppProps = AppProps & {
  Component: NextComponentType<NextPageContext, Record<string, unknown>, Record<string, unknown>> & {
    hideLayout?: boolean;
  };
};

// Separate component so it can use useWallet inside MeshProvider
function AutoReconnect() {
  const { connect, connected } = useWallet();

  useEffect(() => {
    if (connected) return;
    const savedWallet = localStorage.getItem('tixano_wallet');
    if (savedWallet) {
      connect(savedWallet).catch(() => {
        localStorage.removeItem('tixano_wallet');
      });
    }
  }, [connected, connect]);

  return null;
}

export default function App({ Component, pageProps }: CustomAppProps) {
  const router = useRouter();
  const hideLayout = Component.hideLayout ?? false;
  const isDashboard = router.pathname === '/dashboard';
  const isCheckin = router.pathname.startsWith('/dashboard/checkin');
  const isGuests = router.pathname.startsWith('/dashboard/guests');

  return (
    <MeshProvider>
      <AutoReconnect />
      {hideLayout ? (
        <Component {...pageProps} />
      ) : (
        <PageWrapper hideFooter={isDashboard || isCheckin || isGuests} hideNavbar={isCheckin}>
          <Component {...pageProps} />
        </PageWrapper>
      )}
    </MeshProvider>
  );
}