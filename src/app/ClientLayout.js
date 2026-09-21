"use client";
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Moon, Sun, LayoutDashboard, CalendarDays, List, BarChart3, Settings, LogOut, ChevronRight, ChevronLeft, CalendarSearch, PieChart, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { logoutUser } from './actions';

export default function ClientLayout({ children, currentUser }) {
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('ur');
    const [font, setFont] = useState('jameel');
    const [fontSize, setFontSize] = useState('medium');

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const isStaffUser = currentUser?.role === 'STAFF';

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        const savedLang = localStorage.getItem('app_lang') || 'ur';
        setLanguage(savedLang);
        document.documentElement.setAttribute('lang', savedLang);
        document.documentElement.setAttribute('dir', savedLang === 'en' ? 'ltr' : 'rtl');

        const defaultFont = savedLang === 'en' ? 'inter' : 'jameel';
        const savedFont = localStorage.getItem('app_font') || defaultFont;
        setFont(savedFont);
        document.documentElement.setAttribute('data-font', savedFont);

        const savedFontSize = localStorage.getItem('app_font_size') || 'medium';
        setFontSize(savedFontSize);
        document.documentElement.setAttribute('data-font-size', savedFontSize);
    }, []);

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        localStorage.setItem('app_lang', newLang);
        document.documentElement.setAttribute('lang', newLang);
        document.documentElement.setAttribute('dir', newLang === 'en' ? 'ltr' : 'rtl');

        const fallbackFont = newLang === 'en' ? 'inter' : 'jameel';
        setFont(fallbackFont);
        localStorage.setItem('app_font', fallbackFont);
        document.documentElement.setAttribute('data-font', fallbackFont);
    };

    const handleFontChange = (newFont) => {
        setFont(newFont);
        localStorage.setItem('app_font', newFont);
        document.documentElement.setAttribute('data-font', newFont);
    };

    const handleFontSizeChange = (size) => {
        setFontSize(size);
        localStorage.setItem('app_font_size', size);
        document.documentElement.setAttribute('data-font-size', size);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logoutUser();
        router.replace('/');
        router.refresh();
    };

    // Close sidebar on route change (for mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    // Exclude login page from having navbar/sidebar
    if (pathname === '/') {
        return <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>;
    }

    const accountingItems = isStaffUser
        ? [
            { name: 'روزانہ انٹری', nameEn: 'Daily Entry', path: '/daily-entry', icon: CalendarDays, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.12)' },
            { name: 'ڈیلی ریکارڈ', nameEn: 'Daily Records', path: '/records', icon: List, color: '#4f46e5', bgColor: 'rgba(79, 70, 229, 0.12)' },
            { name: 'مخصوص تاریخ', nameEn: 'Specific Date', path: '/daily', icon: CalendarSearch, color: '#7c3aed', bgColor: 'rgba(124, 58, 237, 0.12)' },
            { name: 'خریداری', nameEn: 'Purchases', path: '/purchases', icon: ShoppingCart, color: '#ea580c', bgColor: 'rgba(234, 88, 12, 0.12)' }
        ]
        : [
            { name: 'روزانہ انٹری', nameEn: 'Daily Entry', path: '/daily-entry', icon: CalendarDays, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.12)' },
            { name: 'ماہانہ حساب', nameEn: 'Monthly', path: '/monthly', icon: CalendarDays, color: '#2563eb', bgColor: 'rgba(37, 99, 235, 0.12)' },
            { name: 'ڈیلی ریکارڈ', nameEn: 'Daily Records', path: '/records', icon: List, color: '#4f46e5', bgColor: 'rgba(79, 70, 229, 0.12)' },
            { name: 'مخصوص تاریخ', nameEn: 'Specific Date', path: '/daily', icon: CalendarSearch, color: '#7c3aed', bgColor: 'rgba(124, 58, 237, 0.12)' },
            { name: 'خریداری', nameEn: 'Purchases', path: '/purchases', icon: ShoppingCart, color: '#ea580c', bgColor: 'rgba(234, 88, 12, 0.12)' }
        ];

    const navGroups = [
        {
            title: language === 'ur' ? 'مرکزی' : 'Main',
            items: [
                { name: 'ڈیش بورڈ', nameEn: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.12)' }
            ]
        },
        {
            title: language === 'ur' ? 'حساب' : 'Accounting',
            items: accountingItems
        },
        ...(!isStaffUser ? [{
            title: language === 'ur' ? 'رپورٹس' : 'Analytics',
            items: [
                { name: 'رپورٹس', nameEn: 'Reports', path: '/reports', icon: BarChart3, color: '#0f766e', bgColor: 'rgba(15, 118, 110, 0.12)' },
                { name: 'تجزیہ', nameEn: 'Analysis', path: '/dashboard#analytics', icon: PieChart, color: '#0284c7', bgColor: 'rgba(2, 132, 199, 0.12)' }
            ]
        },
        {
            title: language === 'ur' ? 'سسٹم' : 'System',
            items: [
                { name: 'سیٹنگز', nameEn: 'Settings', path: '/settings', icon: Settings, color: '#475569', bgColor: 'rgba(71, 85, 105, 0.12)' }
            ]
        }] : [])
    ];

    const mainLinks = isStaffUser
        ? [
            { name: 'روزانہ انٹری', nameEn: 'Daily Entry', path: '/daily-entry' },
            { name: 'ڈیلی ریکارڈ', nameEn: 'Daily', path: '/records' },
            { name: 'خریداری', nameEn: 'Purchases', path: '/purchases' }
        ]
        : [
            { name: 'ڈیش بورڈ', nameEn: 'Dashboard', path: '/dashboard' },
            { name: 'روزانہ انٹری', nameEn: 'Daily Entry', path: '/daily-entry' },
            { name: 'ماہانہ حساب', nameEn: 'Monthly', path: '/monthly' },
            { name: 'ڈیلی ریکارڈ', nameEn: 'Daily', path: '/records' },
            { name: 'رپورٹس', nameEn: 'Reports', path: '/reports' },
            { name: 'خریداری', nameEn: 'Purchases', path: '/purchases' }
        ];

    return (
        <div className={`flex-wrapper app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>

            {/* Sidebar Desktop/Mobile */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header" style={{ justifyContent: isCollapsed ? 'center' : 'flex-end', padding: '12px 0' }}>
                    {/* Collapsible Toggle Desktop */}
                    <button className="icon-btn collapse-btn desktop-only" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                    {/* Mobile Close */}
                    <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(false)} style={{ margin: '0 auto' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navGroups.map((group, index) => (
                        <div key={index} className="nav-group">
                            {!isCollapsed && <div className="nav-group-title">{group.title}</div>}
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.path !== '/' && !item.path.startsWith('#') ? pathname === item.path || pathname.startsWith(`${item.path}/`) : false;
                                return (
                                    <Link key={item.path} href={item.path} onClick={() => setSidebarOpen(false)}
                                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                                        style={{
                                            '--item-color': item.color,
                                            '--item-bg': item.bgColor
                                        }}
                                        title={isCollapsed ? (language === 'ur' ? item.name : item.nameEn) : ''}>
                                        <span className="sidebar-icon-tile">
                                            <Icon size={20} className={`sidebar-icon ${isActive ? 'icon-active' : ''}`} />
                                        </span>
                                        {!isCollapsed && <span className="sidebar-label">{language === 'ur' ? item.name : item.nameEn}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}

                    {/* Mobile Settings Controls */}
                    <div className="nav-group mobile-only" style={{ padding: '0 12px', marginTop: '10px' }}>
                        <div className="nav-group-title">{language === 'ur' ? 'ہیڈر سیٹنگز' : 'Header Settings'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="saas-lang-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleLanguageChange(language === 'ur' ? 'en' : 'ur')} title={language === 'ur' ? 'Switch to English' : 'اردو میں تبدیل کریں'}>
                                    {language === 'ur' ? 'English' : 'اردو'}
                                </button>

                                <button className="saas-icon-btn" style={{ border: '1px solid var(--border)', borderRadius: '20px', width: 'auto', padding: '6px 14px', flex: 1, justifyContent: 'center' }} onClick={toggleTheme} title={language === 'ur' ? 'ڈارک موڈ' : 'Dark Mode'}>
                                    {theme === 'light' ? <><Moon size={16} className="me-2" style={{ marginRight: language === 'ur' ? 0 : '8px', marginLeft: language === 'ur' ? '8px' : 0 }} /><span>Dark View</span></> : <><Sun size={16} className="me-2" style={{ marginRight: language === 'ur' ? 0 : '8px', marginLeft: language === 'ur' ? '8px' : 0 }} /><span>Light View</span></>}
                                </button>
                            </div>

                            <select className="saas-select" style={language === 'ur' ? { width: '100%', padding: '8px 14px 8px 30px', backgroundPosition: 'left 10px center' } : { width: '100%' }} value={fontSize} onChange={(e) => handleFontSizeChange(e.target.value)}>
                                <option value="small">{language === 'ur' ? 'فونٹ: چھوٹا' : 'Font: Small'}</option>
                                <option value="medium">{language === 'ur' ? 'فونٹ: درمیانہ' : 'Font: Medium'}</option>
                                <option value="large">{language === 'ur' ? 'فونٹ: بڑا' : 'Font: Large'}</option>
                            </select>

                            <select className="saas-select" style={language === 'ur' ? { width: '100%', padding: '8px 14px 8px 30px', backgroundPosition: 'left 10px center' } : { width: '100%' }} value={font} onChange={(e) => handleFontChange(e.target.value)}>
                                {language === 'ur' ? (
                                    <>
                                        <option value="jameel">Jameel Noori Nastaliq</option>
                                        <option value="noto-nastaliq">Noto Nastaliq Urdu</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="inter">Inter (Default)</option>
                                        <option value="poppins">Poppins</option>
                                        <option value="roboto">Roboto</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="sidebar-link logout-btn" title={isCollapsed ? (language === 'ur' ? 'لاگ آؤٹ' : 'Logout') : ''} disabled={isLoggingOut}>
                        <span className="sidebar-icon-tile">
                            <LogOut size={20} className="sidebar-icon" />
                        </span>
                        {!isCollapsed && <span className="sidebar-label">{isLoggingOut ? (language === 'ur' ? 'لاگ آؤٹ...' : 'Logging out...') : (language === 'ur' ? 'لاگ آؤٹ' : 'Logout')}</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
            )}

            {/* Main Content Area */}
            <div className="main-area">
                <header className="saas-header">
                    <div className="header-container">
                        {/* Right Side (Visual Start in RTL) / Brand */}
                        <div className="header-brand-section">
                            <button className="saas-icon-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                <Menu size={24} />
                            </button>
                            <Link href="/dashboard" className="header-brand">
                                <div className="header-logo-icon">م س</div>
                                <div className="header-brand-text">
                                    <span className="header-brand-title">{language === 'ur' ? 'ریفریشمنٹ اکاؤنٹنگ' : 'Refreshment Accounting'}</span>
                                    <span className="header-brand-subtitle desktop-only">{language === 'ur' ? 'ملک سجاول ریفریشمنٹ' : 'Malik Sajawal Refreshment'}</span>
                                </div>
                            </Link>
                        </div>

                        {/* Center / Navigation */}
                        <div className="header-nav-section desktop-only">
                            {mainLinks.map(item => {
                                const isActive = item.path === '/dashboard' ? pathname === '/dashboard' : pathname === item.path || pathname.startsWith(`${item.path}/`);
                                return (
                                    <Link key={item.path} href={item.path} className={`saas-nav-link ${isActive ? 'active' : ''}`}>
                                        {language === 'ur' ? item.name : item.nameEn}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Left Side (Visual End in RTL) / Actions */}
                        <div className="header-actions-section">
                            <div className="desktop-only header-controls">
                                <select className="saas-select" style={language === 'ur' ? { padding: '8px 14px 8px 30px', backgroundPosition: 'left 10px center' } : {}} value={fontSize} onChange={(e) => handleFontSizeChange(e.target.value)} title={language === 'ur' ? 'فونٹ سائز' : 'Font Size'}>
                                    <option value="small">A-</option>
                                    <option value="medium">A</option>
                                    <option value="large">A+</option>
                                </select>

                                <select className="saas-select" style={language === 'ur' ? { padding: '8px 14px 8px 30px', backgroundPosition: 'left 10px center' } : {}} value={font} onChange={(e) => handleFontChange(e.target.value)} title={language === 'ur' ? 'فونٹ اسٹائل' : 'Font Family'}>
                                    {language === 'ur' ? (
                                        <>
                                            <option value="jameel">Jameel Noori</option>
                                            <option value="noto-nastaliq">Noto Nastaliq</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="inter">Inter</option>
                                            <option value="poppins">Poppins</option>
                                            <option value="roboto">Roboto</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <button className="saas-lang-btn desktop-only" onClick={() => handleLanguageChange(language === 'ur' ? 'en' : 'ur')} title={language === 'ur' ? 'Switch to English' : 'اردو میں تبدیل کریں'}>
                                {language === 'ur' ? 'English' : 'اردو'}
                            </button>

                            <button className="saas-icon-btn desktop-only" onClick={toggleTheme} title={language === 'ur' ? 'ڈارک موڈ' : 'Dark Mode'}>
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            </button>
                        </div>
                    </div>
                </header>

                <main className="content-pad">
                    {children}
                </main>

                <footer className="footer">
                    Powered by Malik Sajawal Accounting System
                </footer>
            </div>

            <style jsx>{`
                .app-layout {
                    flex-direction: row;
                    height: 100vh;
                    overflow: hidden;
                }
                .sidebar {
                    width: 272px;
                    background-color: var(--surface-raised);
                    border-left: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 100;
                    box-shadow: none;
                    padding: 14px;
                    box-sizing: border-box;
                }
                [data-theme='dark'] .sidebar {
                    background-color: #0f172a; 
                    border-left-color: #1e293b;
                }
                .sidebar.collapsed {
                    width: 82px;
                }
                .sidebar-header {
                    padding-bottom: 16px;
                    margin-bottom: 16px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                }
                .sidebar-brand-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    overflow: hidden;
                }
                .sidebar-logo {
                    min-width: 40px;
                    height: 40px;
                    background: var(--primary);
                    color: white;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }
                .sidebar-titles {
                    display: flex;
                    flex-direction: column;
                    white-space: nowrap;
                    overflow: hidden;
                }
                .sidebar-title {
                    font-size: 1rem;
                    font-weight: 800;
                    color: var(--text-main);
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                .sidebar-subtitle {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }
                .sidebar-nav {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    padding-right: 4px; /* Scrollbar breathing room */
                }
                /* Custom Scrollbar for sidebar */
                .sidebar-nav::-webkit-scrollbar {
                    width: 4px;
                }
                .sidebar-nav::-webkit-scrollbar-track {
                    background: transparent;
                }
                .sidebar-nav::-webkit-scrollbar-thumb {
                    background-color: var(--border);
                    border-radius: 4px;
                }
                .nav-group {
                    margin-bottom: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .nav-group:last-child {
                    margin-bottom: 0;
                }
                .nav-group-title {
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--text-muted);
                    opacity: 0.72;
                    margin-bottom: 6px;
                    padding: 0 8px 8px;
                    border-bottom: 1px solid var(--border);
                    text-transform: uppercase;
                    letter-spacing: 0;
                }
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 10px;
                    min-height: 56px;
                    padding: 8px 10px;
                    color: var(--text-main);
                    font-weight: 650;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-decoration: none;
                    background: transparent;
                    border: 1px solid transparent;
                    width: 100%;
                    box-sizing: border-box;
                    border-radius: 8px;
                    text-align: start;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 15px;
                    position: relative;
                    margin-bottom: 0;
                    overflow: hidden;
                    line-height: 1.35;
                }
                .sidebar.collapsed .sidebar-link {
                    justify-content: center;
                    padding: 8px;
                    min-height: 52px;
                }
                .sidebar-icon-tile {
                    width: 38px;
                    height: 38px;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 auto;
                    color: var(--item-color, var(--primary));
                    background-color: var(--item-bg, rgba(15, 159, 122, 0.1));
                    border: 1px solid color-mix(in srgb, var(--item-color, var(--primary)) 18%, transparent);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
                    transition: all 0.25s ease;
                }
                .sidebar-icon {
                    color: currentColor;
                    transition: all 0.3s ease;
                    stroke-width: 2.25;
                }
                .sidebar-label {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .sidebar-link:hover {
                    background-color: color-mix(in srgb, var(--item-color, var(--primary)) 8%, var(--card-bg));
                    border-color: color-mix(in srgb, var(--item-color, var(--primary)) 18%, var(--border));
                    color: var(--item-color, var(--primary));
                }
                html[dir="rtl"] .sidebar-link:hover {
                    transform: translateX(-2px);
                }
                html[dir="ltr"] .sidebar-link:hover {
                    transform: translateX(2px);
                }
                .sidebar-link:hover .sidebar-icon-tile {
                    background-color: var(--item-color, var(--primary));
                    color: white;
                    transform: scale(1.03);
                }
                .sidebar.collapsed .sidebar-link:hover {
                    transform: scale(1.05);
                }
                .sidebar-link.active {
                    background-color: color-mix(in srgb, var(--item-color, var(--primary)) 11%, var(--card-bg));
                    border-color: color-mix(in srgb, var(--item-color, var(--primary)) 24%, var(--border));
                    color: var(--item-color, var(--primary));
                    font-weight: 800;
                    box-shadow: 0 8px 22px rgba(18, 35, 31, 0.06);
                }
                .sidebar-link.active::before {
                    content: '';
                    position: absolute;
                    inset-inline-start: 4px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 4px;
                    height: 24px;
                    background-color: var(--item-color, var(--primary));
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }
                .sidebar-link.active .sidebar-icon-tile {
                    background-color: var(--item-color, var(--primary));
                    color: white;
                    border-color: transparent;
                    box-shadow: 0 8px 18px color-mix(in srgb, var(--item-color, var(--primary)) 25%, transparent);
                }
                [data-theme='dark'] .sidebar-link.active {
                    background-color: color-mix(in srgb, var(--item-color, var(--primary)) 18%, var(--card-bg));
                    box-shadow: none;
                }
                .sidebar-footer {
                    margin-top: auto;
                    padding-top: 16px;
                }
                .logout-btn {
                    color: var(--danger);
                    --item-color: var(--danger);
                    --item-bg: rgba(220, 38, 38, 0.11);
                }
                .logout-btn:hover {
                    background-color: var(--item-bg);
                    color: var(--item-color);
                }
                .main-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    background-color: var(--bg-color);
                    transition: background-color 0.3s;
                }
                .content-pad {
                    flex: 0 0 auto;
                    min-width: 0;
                    width: 100%;
                    overflow-x: hidden;
                }
                .saas-header {
                    position: sticky;
                    top: 0;
                    height: 72px;
                    background: color-mix(in srgb, var(--card-bg) 94%, transparent);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid var(--border);
                    box-shadow: none;
                    z-index: 50;
                    display: flex;
                    align-items: center;
                    padding: 0 1.5rem;
                    transition: all 0.3s ease;
                }
                [data-theme='dark'] .saas-header {
                    background: color-mix(in srgb, var(--card-bg) 94%, transparent);
                    box-shadow: none;
                }
                .header-container {
                    width: 100%;
                    max-width: 1400px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    min-width: 0;
                    height: 100%;
                }
                .header-brand-section {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    min-width: 280px;
                }
                .header-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    text-decoration: none;
                    transition: transform 0.2s;
                }
                .header-brand:hover {
                    transform: translateY(-1px);
                }
                .header-logo-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 8px;
                    background: var(--primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 18px;
                    box-shadow: var(--shadow-sm);
                    border: 1px solid color-mix(in srgb, var(--primary) 30%, var(--border));
                }
                .header-brand-text {
                    display: flex;
                    flex-direction: column;
                }
                .header-brand-title {
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: var(--primary);
                    line-height: 1.2;
                    letter-spacing: 0;
                }
                .header-brand-subtitle {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    margin-top: 2px;
                    text-transform: uppercase;
                    letter-spacing: 0;
                }
                .header-nav-section {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    flex: 1;
                    justify-content: center;
                }
                .saas-nav-link {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    padding: 8px 18px;
                    border-radius: 8px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-decoration: none;
                    position: relative;
                }
                .saas-nav-link:hover {
                    color: var(--text-main);
                    background-color: var(--bg-color);
                    transform: translateY(-1px);
                }
                .saas-nav-link.active {
                    color: var(--primary);
                    background-color: color-mix(in srgb, var(--accent) 12%, transparent);
                    box-shadow: inset 0 -2px 0 var(--accent);
                }
                .header-actions-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 280px;
                    justify-content: flex-end;
                }
                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border-inline-end: 1px solid var(--border);
                    padding-inline-end: 16px;
                    margin-inline-end: 4px;
                }
                .saas-select {
                    appearance: none;
                    background-color: var(--surface-raised);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 8px 30px 8px 14px;
                    color: var(--text-main);
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    font-family: inherit;
                    outline: none;
                    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    background-size: 14px;
                    transition: all 0.2s;
                }
                .saas-select:hover {
                    background-color: var(--card-bg);
                    border-color: var(--border);
                }
                .saas-select:focus {
                    background-color: var(--card-bg);
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }
                .saas-lang-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: transparent;
                    border: 1px solid var(--border);
                    padding: 6px 14px;
                    border-radius: 8px;
                    color: var(--text-main);
                    font-weight: 600;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .saas-lang-btn:hover {
                    background-color: var(--bg-color);
                    border-color: var(--text-main);
                }
                .saas-icon-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: 8px;
                    background-color: transparent;
                    color: var(--text-muted);
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .saas-icon-btn:hover {
                    background-color: var(--bg-color);
                    color: var(--text-main);
                }
                @media (min-width: 1181px) {
                    .desktop-only { display: flex; }
                    .mobile-only { display: none; }
                }
                @media (max-width: 1180px) {
                    .sidebar {
                        width: 280px;
                        position: fixed;
                        top: 0;
                        bottom: 0;
                        right: 0;
                        transform: translateX(100%);
                        z-index: 1000;
                    }
                    .app-layout.sidebar-open .sidebar {
                        transform: translateX(0);
                        box-shadow: -10px 0 25px rgba(0,0,0,0.1);
                    }
                    .mobile-only { display: flex; }
                    .desktop-only { display: none; }
                    .desktop-only.collapse-btn { display: none; }
                    .theme-toggle-text { display: none; }
                }
                .sidebar-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                    backdrop-filter: blur(2px);
                }
                @media (max-width: 1180px) {
                    .app-layout.sidebar-open .sidebar-overlay {
                        display: block;
                    }
                }
                @media print {
                    .sidebar, .top-navbar { display: none !important; }
                    .main-area { overflow-y: visible; height: auto; }
                    .app-layout { height: auto; overflow: visible; display: block; }
                }
            `}</style>
        </div>
    );
}
