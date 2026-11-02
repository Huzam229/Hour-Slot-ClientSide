import { Source_Serif_4 } from 'next/font/google';
import LandingPage from '@/components/landing/LandingPage';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-hs-display',
  display: 'swap',
});

export default function HomePage() {
  return (
    <div className={sourceSerif.variable}>
      <LandingPage />
    </div>
  );
}
