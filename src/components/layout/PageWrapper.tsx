import Navbar from './Navbar';
import Footer from './Footer';

interface PageWrapperProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export default function PageWrapper({ children, hideFooter = false }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      <main className="pt-20 flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}