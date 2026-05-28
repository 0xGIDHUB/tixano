import Navbar from './Navbar';
import Footer from './Footer';

interface PageWrapperProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  hideNavbar?: boolean;
}

export default function PageWrapper({ children, hideFooter = false, hideNavbar = false }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {!hideNavbar && <Navbar />}
      <main className={`flex-1 ${!hideNavbar ? 'pt-20' : ''}`}>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}