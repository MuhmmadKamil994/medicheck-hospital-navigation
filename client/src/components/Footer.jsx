import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

/**
 * Four-column footer per the mockup: brand, Product, Resources, Emergency.
 */
export default function Footer() {
  return (
    <footer className="no-print bg-ink-deep text-[#8E9BB8]">
      <div className="max-w-[1080px] mx-auto px-7 pt-11">
        <div className="grid grid-cols-1 min-[860px]:grid-cols-[1.4fr_1fr_1fr_1fr] gap-[30px] pb-9">
          <div>
            <div className="flex items-center gap-[11px]">
              <Logo size={30} light />
              <span className="font-serif font-bold text-[22px] text-[#F3EFE6]">MediCheck</span>
            </div>
            <p className="text-[13px] leading-[1.7] mt-3 max-w-[260px]">
              Know your symptoms. Find the right care. A final-year project
              helping Pakistanis reach the right doctor in time.
            </p>
          </div>

          <nav aria-label="Product">
            <h5 className="text-xs font-extrabold tracking-[1.6px] text-amber-bright mb-4">PRODUCT</h5>
            <Link to="/" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">Symptom Checker</Link>
            <Link to="/hospitals" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">Find Hospitals</Link>
            <Link to="/hospitals" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">Book Appointment</Link>
            <Link to="/dashboard" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">My Dashboard</Link>
          </nav>

          <nav aria-label="Resources">
            <h5 className="text-xs font-extrabold tracking-[1.6px] text-amber-bright mb-4">RESOURCES</h5>
            <a href="/#how-it-works" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">How triage works</a>
            <a href="/#how-it-works" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">For hospitals</a>
            <a href="/#faq" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">FAQs</a>
            <a href="/#faq" className="mc-link block text-[13.5px] text-[#B9C2D4] hover:text-white mb-[11px]">Contact us</a>
          </nav>

          <div>
            <h5 className="text-xs font-extrabold tracking-[1.6px] text-amber-bright mb-4">EMERGENCY</h5>
            <a href="tel:1122" className="mc-link block text-[#FF8A7D] font-bold text-[15px] mb-[11px] hover:underline">Call 1122</a>
            <span className="block text-[13.5px] text-[#B9C2D4] mb-[11px]">BVH Emergency: 062-9250061</span>
            <span className="block text-[13.5px] text-[#B9C2D4] mb-[11px]">When to call an ambulance</span>
          </div>
        </div>

        <div className="border-t border-[#26344F] py-[18px] flex flex-col min-[860px]:flex-row gap-2 justify-between text-xs text-muted">
          <span>© 2026 MediCheck — Final Year Project, Islamia University of Bahawalpur</span>
          <span className="flex items-center gap-4">
            <span>Built by Muhammad Kamil · Supervised by Mr. Karim Nawaz</span>
            <Link to="/admin/login" className="text-[#5C6B84] hover:text-amber-bright transition-colors duration-200">
              Admin console
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
