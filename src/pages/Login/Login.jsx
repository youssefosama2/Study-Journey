import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../utils/supabaseClient";
import "./Login.css";
const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // =====================================================
  // تغيير البيانات
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };
  // =====================================================
  // التحقق من البيانات
  // =====================================================
  const validateForm = () => {
    const newErrors = {};
    const email = formData.email.trim();
    if (!email) {
      newErrors.email = "من فضلك اكتب البريد الإلكتروني";
    }
    if (!formData.password) {
      newErrors.password = "من فضلك اكتب كلمة المرور";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // =====================================================
  // تسجيل الدخول
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validateForm()) return;
    setLoading(true);
    try {
      console.log("=================================");
      console.log("START LOGIN");
      console.log("=================================");
      const email = formData.email.trim().toLowerCase();
      // =================================================
      // تسجيل الدخول في Supabase Auth
      // =================================================
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });
      console.log("AUTH DATA:", authData);
      console.log("AUTH ERROR:", authError);
      // =================================================
      // خطأ Auth
      // =================================================
      if (authError) {
        console.error("SUPABASE LOGIN ERROR:", authError);
        const errorMessage = authError.message || "";
        const lowerError = errorMessage.toLowerCase();
        let message = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        if (lowerError.includes("invalid login credentials")) {
          message = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        }
        if (lowerError.includes("email not confirmed")) {
          message = "البريد الإلكتروني غير مؤكد.";
        }
        await Swal.fire({
          icon: "error",
          title: "تعذر تسجيل الدخول",
          text: message,
          confirmButtonText: "حسنًا",
        });
        return;
      }
      // =================================================
      // التأكد من وجود Session
      // =================================================
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log("SESSION AFTER LOGIN:", sessionData);
      console.log("SESSION ERROR:", sessionError);
      if (sessionError) {
        console.error("SESSION ERROR:", sessionError);
        throw sessionError;
      }
      // =================================================
      // استخراج Session
      // =================================================
      const session = sessionData?.session;
      if (!session) {
        console.error("NO SESSION AFTER LOGIN");
        throw new Error(
          "تم تسجيل الدخول ولكن لم يتم إنشاء جلسة للمستخدم"
        );
      }
      // =================================================
      // استخراج المستخدم من Session
      // =================================================
      const user = session.user;
      if (!user?.id) {
        console.error("NO USER ID:", user);
        throw new Error("تعذر الحصول على بيانات المستخدم");
      }
      console.log("AUTHENTICATED USER:", user);
      console.log("AUTHENTICATED USER ID:", user.id);
      // =================================================
      // التأكد مرة ثانية من المستخدم من Supabase
      // =================================================
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();
      console.log("GET USER DATA:", userData);
      console.log("GET USER ERROR:", userError);
      if (userError) {
        console.error("GET USER ERROR:", userError);
        throw userError;
      }
      if (!userData?.user?.id) {
        throw new Error("تعذر التحقق من هوية المستخدم");
      }
      // نستخدم المستخدم الذي رجع من Supabase
      const authenticatedUser = userData.user;
      console.log("FINAL AUTH USER:", authenticatedUser);
      console.log("FINAL AUTH USER ID:", authenticatedUser.id);
      // =================================================
      // جلب بيانات الطالب
      // =================================================
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("student_profiles")
        .select(`
          id,
          user_id,
          student_code,
          full_name,
          phone,
          avatar_url,
          section,
          notifications_enabled
        `)
        .eq("user_id", authenticatedUser.id)
        .maybeSingle();
      console.log("PROFILE DATA:", profileData);
      console.log("PROFILE ERROR:", profileError);
      // =================================================
      // خطأ في جلب Profile
      // =================================================
      if (profileError) {
        console.error("PROFILE FETCH ERROR:", profileError);
        await Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            profileError.message ||
            "تعذر تحميل بيانات الطالب",
          confirmButtonText: "حسنًا",
        });
        return;
      }
      // =================================================
      // Profile غير موجود
      // =================================================
      if (!profileData) {
        console.error(
          "PROFILE NOT FOUND FOR USER:",
          authenticatedUser.id
        );
        await Swal.fire({
          icon: "error",
          title: "بيانات الطالب غير موجودة",
          text:
            "تم تسجيل الدخول بنجاح ولكن لم يتم العثور على بيانات الطالب.",
          confirmButtonText: "حسنًا",
        });
        return;
      }
      // =================================================
      // حفظ بيانات الطالب
      // =================================================
      localStorage.setItem(
        "studentProfile",
        JSON.stringify(profileData)
      );
      // =================================================
      // حفظ بيانات المستخدم
      // =================================================
      localStorage.setItem(
        "user",
        JSON.stringify(authenticatedUser)
      );
      // =================================================
      // التأكد أن Session موجودة قبل الانتقال
      // =================================================
      const {
        data: finalSessionData,
      } = await supabase.auth.getSession();
      console.log(
        "FINAL SESSION BEFORE NAVIGATION:",
        finalSessionData?.session
      );
      if (!finalSessionData?.session) {
        throw new Error(
          "جلسة تسجيل الدخول غير متاحة قبل الانتقال"
        );
      }
      console.log("LOGIN SUCCESS:", profileData);
      // =================================================
      // رسالة النجاح
      // =================================================
      await Swal.fire({
        icon: "success",
        title: "أهلًا بك 👋",
        text: `مرحبًا ${profileData.full_name}`,
        confirmButtonText: "دخول",
      });
      // =================================================
      // الانتقال إلى Home
      // =================================================
      navigate("/home", {
        replace: true,
      });
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      await Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text:
          error?.message ||
          "حدث خطأ غير متوقع أثناء تسجيل الدخول",
        confirmButtonText: "حسنًا",
      });
    } finally {
      setLoading(false);
    }
  };
  // =====================================================
  // UI
  // =====================================================
  return (
    <main className="login-page" dir="rtl">
      <div className="login-container">
        <div className="login-card">
          {/* HEADER */}
          <div className="login-header">
            <div className="login-logo">
              <FaGraduationCap />
            </div>
            <h1>تسجيل الدخول</h1>
            <p>ادخل إلى رحلتك الدراسية</p>
          </div>
          {/* FORM */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* EMAIL */}
            <div className="form-group">
              <label htmlFor="email">البريد الإلكتروني</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
                className={
                  errors.email
                    ? "input-error"
                    : ""
                }
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && (
                <span className="error-message">
                  {errors.email}
                </span>
              )}
            </div>
            {/* PASSWORD */}
            <div className="form-group">
              <label htmlFor="password">كلمة المرور</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="أدخل كلمة المرور"
                  value={formData.password}
                  onChange={handleChange}
                  className={
                    errors.password
                      ? "input-error"
                      : ""
                  }
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showPassword ? (
                    <FaEyeSlash />
                  ) : (
                    <FaEye />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="error-message">
                  {errors.password}
                </span>
              )}
            </div>
            {/* SUBMIT */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "جاري تسجيل الدخول..."
                : "تسجيل الدخول"}
            </button>
          </form>
          {/* FOOTER */}
          <div className="login-footer">
            <span>ليس لديك حساب؟</span>
            <Link to="/SignUp">إنشاء حساب جديد</Link>
          </div>
        </div>
      </div>
    </main>
  );
};
export default Login;