import React from "react";
import {
  Container,
  Row,
  Col,
  Button,
} from "reactstrap";
import {
  FaGraduationCap,
  FaArrowLeft,
  FaTrophy,
  FaFire,
  FaChartBar,
  FaTimesCircle,
  FaClipboardList,
  FaBrain,
  FaStopwatch,
  FaCalendarAlt,
  FaBookOpen,
  FaRocket,
  FaBullseye,
  FaUsers,
  FaClock,
  FaPlay,
  FaCheckCircle,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "./Home-Landing-Page.css";
import howSectionImage from "../../assets/how-section.webp";
import howSectionPhoneImage from "../../assets/how-section-phone.webp";
import aboutStudyImage from "../../assets/about-study.webp";
import ctaSectionImage from "../../assets/cta-sec.webp";
const features = [
  {
    icon: <FaBookOpen />,
    title: "إدارة المنهج",
    text: "تابع المنهج وحدد مستواك في كل درس",
    color: "blue",
  },
  {
    icon: <FaBullseye />,
    title: "الأهداف",
    text: "حدد هدفك وخليك مركز عليه لحد ما توصله",
    color: "red",
  },
  {
    icon: <FaCalendarAlt />,
    title: "خطة المذاكرة",
    text: "خطط يومية وأسبوعية تناسب وقتك وأهدافك",
    color: "purple",
  },
  {
    icon: <FaStopwatch />,
    title: "جلسات التركيز",
    text: "تقنية البومودورو لزيادة تركيزك وإنتاجيتك",
    color: "green",
  },
  {
    icon: <FaBrain />,
    title: "المراجعة",
    text: "نظام مراجعة ذكي يساعدك على تثبيت المعلومات",
    color: "pink",
  },
  {
    icon: <FaClipboardList />,
    title: "الامتحانات",
    text: "سجل امتحاناتك، تابع نتائجك وشوف تطورك",
    color: "purple",
  },
  {
    icon: <FaTimesCircle />,
    title: "متابعة الأخطاء",
    text: "سجل أخطاءك، افهمها وتعلم منها",
    color: "red",
  },
  {
    icon: <FaChartBar />,
    title: "الإحصائيات",
    text: "تقارير ورسوم بيانية ذكية توضح تقدمك",
    color: "blue",
  },
  {
    icon: <FaFire />,
    title: "الاستمرارية",
    text: "حافظ على الاستمرارية، كل يوم خطوة نحو هدفك",
    color: "orange",
  },
  {
    icon: <FaTrophy />,
    title: "الإنجازات",
    text: "حقق إنجازات وارفع مستواك واكسب شارات مميزة",
    color: "gold",
  },
];
const testimonials = [
  {
    text: "Study Journey غيرت حياتي حرفيًا بقى عندي دافع وشغف كل يوم",
    name: "محمد أحمد",
    image: "https://i.pravatar.cc/100?img=12",
  },
  {
    text: "أول مرة أعرف أذاكر بانتظام وأحافظ على الـ Streak بتاعي كل يوم 🔥",
    name: "أحمد مصطفى",
    image: "https://i.pravatar.cc/100?img=11",
  },
  {
    text: "متابعة الأخطاء والمراجعة الذكية خلت درجاتي تتحسن بشكل كبير",
    name: "فاطمة علي",
    image: "https://i.pravatar.cc/100?img=47",
  },
];
export default function HomeLandingPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  return (
    <div
      className={`HomeLandingPage ${darkMode ? "dark-mode" : ""}`}
      dir="rtl"
    >
      {/* ================= NAVBAR ================= */}
      <nav className="main-navbar">
        <Container>
          <div className="nav-content">
            <div className="brand">
              <div className="brand-icon">
                <FaGraduationCap />
              </div>
              <div className="brand-text">
                <strong>Study</strong>
                <span>Journey</span>
              </div>
            </div>
            <div className="nav-links">
              <a href="#home" className="active">الرئيسية</a>
              <a href="#features">المميزات</a>
              <a href="#how">كيف يعمل؟</a>
              <a href="#who">من نحن؟</a>
              <a href="#contact">تواصل معنا</a>
            </div>
            <div className="nav-actions">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleDarkMode}
                aria-label={
                  darkMode
                    ? "الوضع الفاتح"
                    : "الوضع الداكن"
                }
              >
                {darkMode ? <FaSun /> : <FaMoon />}
              </button>
              <Button
                className="login-btn"
                onClick={() => navigate("/Login")}
              >
                تسجيل الدخول
              </Button>
              <Button
                className="signup-btn"
                onClick={() => navigate("/SignUp")}
              >
                ابدأ مجانًا
              </Button>
            </div>
          </div>
        </Container>
      </nav>
      {/* ================= HERO ================= */}
      <section className="hero-section" id="home">
        <Container>
          <div className="hero-inner">
            {/* ================= HERO CONTENT ================= */}
            <div className="hero-content">
              <span className="hero-badge">✨ رحلتك تبدأ من هنا</span>
              <h1>
                خلي مذاكرتك
                <br />
                <span>منظمة...</span>
                <br />
                وشوف تقدمك كل يوم!
              </h1>
              <p>
                Study Journey هي منصتك المتكاملة اللي هتساعدك
                تنظم مذاكرتك، تحدد أهدافك، تتابع تقدمك،
                وتحافظ على استمراريتك يوم بعد يوم.
              </p>
              <div className="hero-buttons">
                <Button
                  className="primary-btn"
                  onClick={() => navigate("/SignUp")}
                >
                  ابدأ تجربتك المجانية
                  <FaArrowLeft />
                </Button>
                <Button className="secondary-btn">
                  <FaPlay />
                  شوف إزاي بنشتغل
                </Button>
              </div>
              <div className="hero-note">
                <FaCheckCircle />
                تجربة مجانية 7 أيام
                <span>•</span>
                بدون بطاقة ائتمان
              </div>
            </div>
            {/* ================= HERO VISUAL ================= */}
            <div className="hero-visual">
              <div className="hero-visual-content">
                <div className="hero-main-icon">
                  <FaGraduationCap />
                </div>
                <h2>
                  كل اللي تحتاجه
                  <br />
                  <span>عشان تنجح</span>
                </h2>
                <p>
                  خطط، ذاكر، راجع، تابع تقدمك
                  وحقق أهدافك في مكان واحد.
                </p>
                <div className="hero-mini-cards">
                  <div className="hero-mini-card">
                    <div className="hero-mini-icon blue">
                      <FaCalendarAlt />
                    </div>
                    <div>
                      <strong>خطة مذاكرة</strong>
                      <span>نظم وقتك</span>
                    </div>
                  </div>
                  <div className="hero-mini-card">
                    <div className="hero-mini-icon green">
                      <FaStopwatch />
                    </div>
                    <div>
                      <strong>جلسات تركيز</strong>
                      <span>ذاكر بتركيز</span>
                    </div>
                  </div>
                  <div className="hero-mini-card">
                    <div className="hero-mini-icon orange">
                      <FaFire />
                    </div>
                    <div>
                      <strong>استمرارية</strong>
                      <span>حافظ على الـ Streak</span>
                    </div>
                  </div>
                  <div className="hero-mini-card">
                    <div className="hero-mini-icon purple">
                      <FaChartBar />
                    </div>
                    <div>
                      <strong>تابع تقدمك</strong>
                      <span>اعرف مستواك</span>
                    </div>
                  </div>
                </div>
                <div className="hero-success-card">
                  <FaTrophy />
                  <div>
                    <strong>كل يوم إنجاز جديد 🏆</strong>
                    <span>خطوة صغيرة النهارده = فرق كبير بكرة</span>
                  </div>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="hero-decoration hero-decoration-1"></div>
              <div className="hero-decoration hero-decoration-2"></div>
              <div className="hero-decoration hero-decoration-3"></div>
            </div>
          </div>
        </Container>
      </section>
      {/* ================= FEATURES ================= */}
      <section className="features-section" id="features">
        <Container>
          <div className="section-title">
            <h2>كل اللي تحتاجه في منصة واحدة</h2>
            <span></span>
          </div>
          <Row className="row-cols-2 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 gy-4">
            {features.map((feature, index) => (
              <Col key={index}>
                <div className="feature-card">
                  <div className={`feature-icon ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>
      {/* ================= HOW ================= */}
      <section className="how-section" id="how">
        <div className="how-img-desktop">
          <img
            src={howSectionImage}
            alt="كيف تعمل Study Journey"
          />
        </div>
        <div className="how-img-mobile">
          <img
            src={howSectionPhoneImage}
            alt="كيف تعمل Study Journey على الهاتف"
          />
        </div>
      </section>
      {/* ================= STATS ================= */}
      <section className="stats-section" id="stats">
        <Container>
          <div className="stats-title">
            <h2>منصة بتغير شكل المذاكرة</h2>
          </div>
          <Row className="text-center">
            <Col md="4">
              <div className="big-stat">
                <FaUsers />
                <h2>+500</h2>
                <p>طالب نشط</p>
              </div>
            </Col>
            <Col md="4">
              <div className="big-stat">
                <FaBookOpen />
                <h2>+10,000</h2>
                <p>جلسة مذاكرة</p>
              </div>
            </Col>
            <Col md="4">
              <div className="big-stat">
                <FaClock />
                <h2>+50,000</h2>
                <p>ساعة تركيز</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      {/* ================= TESTIMONIALS ================= */}
      <section className="testimonials-section">
        <Container>
          <div className="section-title">
            <h2>الطلاب بيقولوا إيه؟</h2>
            <span></span>
          </div>
          <div className="testimonials-slider">
            <Swiper
              dir="rtl"
              modules={[Autoplay, Pagination, Navigation]}
              spaceBetween={22}
              slidesPerView={1}
              loop={true}
              grabCursor={true}
              autoplay={{
                delay: 3500,
                disableOnInteraction: false,
              }}
              pagination={{
                clickable: true,
              }}
              navigation={true}
              breakpoints={{
                576: {
                  slidesPerView: 2,
                  spaceBetween: 18,
                },
                992: {
                  slidesPerView: 3,
                  spaceBetween: 22,
                },
              }}
            >
              {testimonials.map((item, index) => (
                <SwiperSlide key={index}>
                  <div className="testimonial-card">
                    <div className="testimonial-content">
                      <div className="quote-icon">“</div>
                      <p>{item.text}</p>
                      <div className="stars">★★★★★</div>
                    </div>
                    <div className="testimonial-user">
                      <img
                        src={item.image}
                        alt={item.name}
                      />
                      <div className="testimonial-info">
                        <strong>{item.name}</strong>
                        <span>طالب</span>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </Container>
      </section>
      {/* ================= ABOUT ================= */}
      <section className="about-section" id="who">
        <Container>
          <Row className="align-items-center g-5">
            <Col
              lg="6"
              className="about-image-col order-1 order-lg-2"
            >
              <div className="about-image">
                <img
                  src={aboutStudyImage}
                  alt="Study Journey"
                />
              </div>
            </Col>
            <Col
              lg="6"
              className="order-2 order-lg-1"
            >
              <div className="about-content">
                <div className="about-label">✨ من نحن؟</div>
                <h2>
                  مش مجرد منصة مذاكرة...
                  <span>دي رحلتك التعليمية</span>
                </h2>
                <p className="about-description">
                  Study Journey هي منصة تعليمية مصممة مخصوص لطلاب الثانوية
                  العامة، عشان تساعدك تنظم مذاكرتك وتتابع تقدمك وتوصل لأهدافك
                  خطوة بخطوة.
                </p>
                <p className="about-description">
                  جمعنا كل الأدوات اللي محتاجها في مكان واحد، من التخطيط
                  والمذاكرة والمراجعة لحد متابعة مستواك وتحليل أخطائك.
                </p>
                <div className="about-features">
                  <div className="about-feature">
                    <div className="about-feature-icon">📚</div>
                    <div>
                      <h3>مذاكرة منظمة</h3>
                      <p>خطط ليومك واعرف هتذاكر إيه.</p>
                    </div>
                  </div>
                  <div className="about-feature">
                    <div className="about-feature-icon">📈</div>
                    <div>
                      <h3>تابع تقدمك</h3>
                      <p>شوف مستواك وتطورك باستمرار.</p>
                    </div>
                  </div>
                  <div className="about-feature">
                    <div className="about-feature-icon">🎯</div>
                    <div>
                      <h3>حقق أهدافك</h3>
                      <p>حدد هدفك واشتغل عليه خطوة بخطوة.</p>
                    </div>
                  </div>
                  <div className="about-feature">
                    <div className="about-feature-icon">🔥</div>
                    <div>
                      <h3>استمر كل يوم</h3>
                      <p>حافظ على الـ Streak وزود إنجازك.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      {/* ================= CTA ================= */}
      <section className="cta-section">
        <Container>
          <div className="cta-box">
            <div className="cta-decoration cta-decoration-1"></div>
            <div className="cta-decoration cta-decoration-2"></div>
            <div className="cta-target">
              <img
                src={ctaSectionImage}
                width={130}
                alt=""
              />
            </div>
            <div className="cta-content">
              <span className="cta-label">ابدأ دلوقتي 🚀</span>
              <h2>جاهز تبدأ رحلتك وتحقق حلمك؟</h2>
              <p>
                ابدأ تجربتك المجانية لمدة 7 أيام
                واكتشف كل الأدوات اللي هتساعدك تنظم مذاكرتك
                وتوصل لأهدافك.
              </p>
              <Button className="primary-btn">
                ابدأ تجربتك المجانية
                <FaArrowLeft />
              </Button>
            </div>
          </div>
        </Container>
      </section>
      {/* ================= FOOTER ================= */}
      <footer className="footer" id="contact">
        <Container>
          <Row className="gy-5">
            <Col lg="5" md="12">
              <div className="footer-brand">
                <div className="brand">
                  <div className="brand-icon">
                    <FaGraduationCap />
                  </div>
                  <div className="brand-text">
                    <strong>Study</strong>
                    <span>Journey</span>
                  </div>
                </div>
                <p>
                  منصة متكاملة تساعدك على تنظيم مذاكرتك،
                  متابعة تقدمك، وتحقيق أهدافك الدراسية
                  خطوة بخطوة.
                </p>
              </div>
            </Col>
            <Col lg="2" md="4" sm="6">
              <div className="footer-links">
                <h4>روابط سريعة</h4>
                <a href="#home">الرئيسية</a>
                <a href="#features">المميزات</a>
                <a href="#how">كيف يعمل؟</a>
                <a href="#stats">إحصائيات</a>
              </div>
            </Col>
            <Col lg="2" md="4" sm="6">
              <div className="footer-links">
                <h4>الدعم</h4>
                <a href="https://wa.me/+201091654379">تواصل معنا</a>
                <a href="#contact">الأسئلة الشائعة</a>
                <a href="#contact">سياسة الخصوصية</a>
              </div>
            </Col>
            <Col lg="2" md="4" sm="6">
              <div className="footer-links">
                <h4>عن المنصة</h4>
                <a href="#who">من نحن</a>
                <a href="#features">المميزات</a>
                <a href="#contact">تواصل معنا</a>
              </div>
            </Col>
          </Row>
            <div className="copyright">
              <span>© 2026 Study Journey</span>
                <div className="developer-credit">
                  Designed & Developed by <strong>Youssef Osama</strong>
                </div>
              <span>جميع الحقوق محفوظة</span>
            </div>

        </Container>
      </footer>
    </div>
  );
}