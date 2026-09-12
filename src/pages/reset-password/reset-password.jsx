import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../utils/supabaseClient";
import "./reset-password.css";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // =====================================================
  // التأكد من وجود جلسة استعادة كلمة المرور
  // =====================================================
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log("RESET PASSWORD SESSION:", session);
        console.log("RESET PASSWORD SESSION ERROR:", error);

        if (error || !session) {
          await Swal.fire({
            icon: "error",
            title: "الرابط غير صالح",
            text:
              "رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته.",
            confirmButtonText: "العودة لتسجيل الدخول",
          });

          navigate("/login", { replace: true });
          return;
        }
      } catch (error) {
        console.error(
          "CHECK RESET SESSION ERROR:",
          error
        );

        await Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر التحقق من رابط استعادة كلمة المرور.",
          confirmButtonText: "العودة لتسجيل الدخول",
        });

        navigate("/login", { replace: true });
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate]);

  // =====================================================
  // تغيير كلمة المرور
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // -----------------------------------------------------
    // التحقق من كلمة المرور
    // -----------------------------------------------------
    if (!password.trim()) {
      await Swal.fire({
        icon: "error",
        title: "كلمة المرور مطلوبة",
        text: "من فضلك أدخل كلمة المرور الجديدة.",
        confirmButtonText: "حسنًا",
      });

      return;
    }

    if (password.length < 6) {
      await Swal.fire({
        icon: "error",
        title: "كلمة المرور ضعيفة",
        text:
          "يجب أن تكون كلمة المرور 6 أحرف على الأقل.",
        confirmButtonText: "حسنًا",
      });

      return;
    }

    if (password !== confirmPassword) {
      await Swal.fire({
        icon: "error",
        title: "كلمات المرور غير متطابقة",
        text:
          "تأكد أن تأكيد كلمة المرور مطابق لكلمة المرور الجديدة.",
        confirmButtonText: "حسنًا",
      });

      return;
    }

    try {
      setLoading(true);

      // =================================================
      // تحديث كلمة المرور في Supabase Auth
      // =================================================
      const { error } =
        await supabase.auth.updateUser({
          password: password,
        });

      if (error) {
        console.error(
          "UPDATE PASSWORD ERROR:",
          error
        );

        throw error;
      }

      console.log(
        "PASSWORD UPDATED SUCCESSFULLY"
      );

      // =================================================
      // تسجيل الخروج بعد تغيير الباسورد
      // =================================================
      await supabase.auth.signOut();

      // =================================================
      // رسالة النجاح
      // =================================================
      await Swal.fire({
        icon: "success",
        title: "تم تغيير كلمة المرور ✅",
        text:
          "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.",
        confirmButtonText: "تسجيل الدخول",
      });

      // =================================================
      // العودة إلى Login
      // =================================================
      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "RESET PASSWORD ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "تعذر تغيير كلمة المرور",
        text:
          error?.message ||
          "حدث خطأ أثناء تحديث كلمة المرور.",
        confirmButtonText: "حسنًا",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // شاشة التحقق
  // =====================================================
  if (checkingSession) {
    return (
      <main
        className="reset-password-page"
        dir="rtl"
      >
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="reset-password-loading">
              <div className="loading-spinner"></div>

              <p>
                جاري التحقق من رابط الاستعادة...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // UI
  // =====================================================
  return (
    <main
      className="reset-password-page"
      dir="rtl"
    >
      <div className="reset-password-container">
        <div className="reset-password-card">

          {/* HEADER */}
          <div className="reset-password-header">
            <div className="reset-password-logo">
              <FaGraduationCap />
            </div>

            <h1>
              إعادة تعيين كلمة المرور
            </h1>

            <p>
              اختر كلمة مرور جديدة لحسابك
            </p>
          </div>

          {/* FORM */}
          <form
            className="reset-password-form"
            onSubmit={handleSubmit}
          >

            {/* PASSWORD */}
            <div className="reset-form-group">
              <label htmlFor="new-password">
                كلمة المرور الجديدة
              </label>

              <div className="reset-password-input-wrapper">
                <input
                  id="new-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="أدخل كلمة المرور الجديدة"
                  disabled={loading}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="reset-password-toggle"
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
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="reset-form-group">
              <label htmlFor="confirm-password">
                تأكيد كلمة المرور
              </label>

              <div className="reset-password-input-wrapper">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="أعد كتابة كلمة المرور"
                  disabled={loading}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="reset-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (prev) => !prev
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showConfirmPassword ? (
                    <FaEyeSlash />
                  ) : (
                    <FaEye />
                  )}
                </button>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="reset-password-submit"
              disabled={loading}
            >
              {loading
                ? "جاري تحديث كلمة المرور..."
                : "تحديث كلمة المرور"}
            </button>

            {/* BACK */}
            <button
              type="button"
              className="reset-password-back"
              onClick={() =>
                navigate("/login")
              }
              disabled={loading}
            >
              العودة لتسجيل الدخول
            </button>

          </form>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;