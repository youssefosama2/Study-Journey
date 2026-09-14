import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaGraduationCap } from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../utils/supabaseClient";
import "./SignUp.css";

const grades = [
  { value: "first_secondary", label: "أولى ثانوي" },
  { value: "second_secondary", label: "تانية ثانوي" },
  { value: "third_secondary", label: "تالتة ثانوي" },
];

const systems = [
  { value: "general", label: "النظام العام" },
  { value: "baccalaureate", label: "البكالوريا المصرية" },
];

const generalDivisions = [
  "علمي علوم",
  "علمي رياضة",
  "أدبي",
];

const baccalaureateTracks = [
  {
    value: "medicine_life",
    label: "الطب وعلوم الحياة",
  },
  {
    value: "engineering_cs",
    label: "الهندسة وعلوم الحاسب",
  },
  {
    value: "business",
    label: "الأعمال",
  },
  {
    value: "arts",
    label: "الآداب والفنون",
  },
];

const SignUp = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",

    gradeLevel: "",
    educationSystem: "",
    track: "",
    division: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // تغيير البيانات
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // تغيير الصف
      if (name === "gradeLevel") {
        updated.track = "";
        updated.division = "";
        if (value === "third_secondary") {
          updated.educationSystem = "general";
        } else {
          updated.educationSystem = "";
        }
      }

      // تغيير النظام
      if (name === "educationSystem") {
        updated.track = "";
        updated.division = "";
      }

      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // =====================================================
  // هل الطالب تالتة ثانوي؟
  // =====================================================
  const isThirdSecondary =
    formData.gradeLevel === "third_secondary";

  // =====================================================
  // هل الطالب بكالوريا؟
  // =====================================================
  const isBaccalaureate =
    formData.educationSystem === "baccalaureate";

  // =====================================================
  // هل الطالب تانية بكالوريا؟
  // =====================================================
  const isSecondBaccalaureate =
    formData.gradeLevel === "second_secondary" &&
    formData.educationSystem === "baccalaureate";

  // =====================================================
  // التحقق من البيانات
  // =====================================================
  const validateForm = () => {
    const newErrors = {};

    // الاسم
    if (!formData.name.trim()) {
      newErrors.name = "من فضلك اكتب اسمك";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "الاسم يجب أن يكون 3 أحرف على الأقل";
    }

    // الهاتف
    const phone = formData.phone.trim();

    if (!phone) {
      newErrors.phone = "من فضلك اكتب رقم الهاتف";
    } else if (!/^01[0125][0-9]{8}$/.test(phone)) {
      newErrors.phone = "رقم الهاتف المصري غير صحيح";
    }

    // البريد
    const email = formData.email.trim();

    if (!email) {
      newErrors.email = "من فضلك اكتب البريد الإلكتروني";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "البريد الإلكتروني غير صحيح";
    }

    // الصف
    if (!formData.gradeLevel) {
      newErrors.gradeLevel = "من فضلك اختر الصف الدراسي";
    }

    // النظام
    // تالتة ثانوي = النظام العام تلقائيًا
    if (
      !isThirdSecondary &&
      !formData.educationSystem
    ) {
      newErrors.educationSystem =
        "من فضلك اختر النظام الدراسي";
    }

    // تالتة ثانوي
    if (isThirdSecondary) {
      if (!formData.division) {
        newErrors.division = "من فضلك اختر الشعبة";
      }
    }

    // تانية بكالوريا
    if (isSecondBaccalaureate) {
      if (!formData.track) {
        newErrors.track = "من فضلك اختر المسار";
      }
    }

    // كلمة المرور
    if (!formData.password) {
      newErrors.password = "من فضلك اكتب كلمة المرور";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }

    // تأكيد كلمة المرور
    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "من فضلك أكد كلمة المرور";
    } else if (
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword =
        "كلمتا المرور غير متطابقتين";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =====================================================
  // إنشاء الحساب
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!validateForm()) return;

    setLoading(true);

    try {
      console.log("=================================");
      console.log("START SIGN UP");
      console.log("=================================");

      const email = formData.email.trim().toLowerCase();
      const password = formData.password;
      const name = formData.name.trim();
      const phone = formData.phone.trim();

      const gradeLevel = formData.gradeLevel;
      const educationSystem = formData.educationSystem;

      let division = formData.division || null;
      let track = formData.track || null;

      // تالتة ثانوي تستخدم division القديمة
      if (isThirdSecondary) {
        track = null;
      }

      // أولى بكالوريا ليس لها مسار
      if (
        formData.gradeLevel === "first_secondary" &&
        isBaccalaureate
      ) {
        track = null;
      }

      // =====================================================
      // قراءة كود الدعوة من الرابط
      // مثال: /signup?ref=ABC12345
      // =====================================================
      const searchParams = new URLSearchParams(
        window.location.search
      );

      const referralCode =
        searchParams.get("ref")?.trim() || null;

      console.log(
        "REFERRAL CODE:",
        referralCode || "لا يوجد"
      );

      console.log("GRADE:", gradeLevel);
      console.log("SYSTEM:", educationSystem);
      console.log("DIVISION:", division);
      console.log("TRACK:", track);

      // =====================================================
      // إنشاء المستخدم في Supabase Auth
      // =====================================================
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email,
          password,

          options: {
            data: {
              name,
              phone,

              grade_level: gradeLevel,
              education_system: educationSystem,

              division,
              track,

              referral_code_used: referralCode,
            },
          },
        });

      // Debug
      console.log("AUTH DATA:", authData);
      console.log("AUTH ERROR:", authError);

      // =====================================================
      // خطأ في إنشاء الحساب
      // =====================================================
      if (authError) {
        console.error(
          "SUPABASE AUTH ERROR:",
          authError
        );

        const errorMessage = authError.message || "";
        const lowerError =
          errorMessage.toLowerCase();

        let message =
          "حدث خطأ أثناء إنشاء الحساب";

        // البريد مستخدم بالفعل
        if (
          lowerError.includes("already registered") ||
          lowerError.includes(
            "user already registered"
          ) ||
          lowerError.includes("already exists")
        ) {
          message =
            "البريد الإلكتروني مستخدم بالفعل";
        }

        // كلمة المرور
        else if (lowerError.includes("password")) {
          message =
            "كلمة المرور غير مقبولة. تأكد أنها 8 أحرف على الأقل.";
        }

        // البريد غير صحيح
        else if (
          lowerError.includes("invalid email") ||
          lowerError.includes("email address")
        ) {
          message =
            "البريد الإلكتروني غير صحيح.";
        }

        // Database / Trigger
        else if (
          lowerError.includes("database error") ||
          lowerError.includes("saving new user")
        ) {
          message =
            "حدث خطأ في قاعدة البيانات أثناء إنشاء الحساب. تأكد من إعدادات Supabase والـ Trigger.";
        }

        // أي خطأ آخر
        else {
          message = errorMessage;
        }

        await Swal.fire({
          icon: "error",
          title: "تعذر إنشاء الحساب",
          text: message,
          confirmButtonText: "حسنًا",
        });

        return;
      }

      // =====================================================
      // التأكد من إنشاء المستخدم
      // =====================================================
      const user = authData?.user;

      if (!user) {
        console.error(
          "No user returned from Supabase"
        );

        throw new Error(
          "لم يتم إنشاء المستخدم"
        );
      }

      console.log(
        "USER CREATED:",
        user
      );

      // =====================================================
      // الـ Profile يتم إنشاؤه تلقائيًا
      // عن طريق Database Trigger
      // =====================================================
      console.log(
        "Student profile and referral will be created by database trigger."
      );

      // =====================================================
      // نجاح التسجيل
      // =====================================================
      await Swal.fire({
        icon: "success",
        title: "تم إنشاء الحساب بنجاح 🎉",

        text: referralCode
          ? "تم تسجيلك بنجاح عن طريق رابط الدعوة. يمكنك تسجيل الدخول الآن."
          : "تم إنشاء حسابك ويمكنك تسجيل الدخول الآن.",

        confirmButtonText:
          "تسجيل الدخول",
      });

      // =====================================================
      // الانتقال إلى Login
      // =====================================================
      navigate("/Login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "SIGNUP ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text:
          error?.message ||
          "حدث خطأ غير متوقع أثناء إنشاء الحساب",
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
    <main
      className="signup-page"
      dir="rtl"
    >
      <div className="signup-container">
        <div className="signup-card">

          {/* HEADER */}
          <div className="signup-header">
            <div className="signup-logo">
              <FaGraduationCap />
            </div>

            <h1>أنشئ حسابك</h1>

            <p>
              ابدأ رحلتك الدراسية ونظّم مذاكرتك بشكل أفضل
            </p>
          </div>

          {/* FORM */}
          <form
            className="signup-form"
            onSubmit={handleSubmit}
          >

            {/* NAME + PHONE */}
            <div className="form-row">

              <div className="form-group">
                <label htmlFor="name">
                  الاسم بالكامل
                </label>

                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="اكتب اسمك بالكامل"
                  value={formData.name}
                  onChange={handleChange}
                  className={
                    errors.name
                      ? "input-error"
                      : ""
                  }
                  disabled={loading}
                />

                {errors.name && (
                  <span className="error-message">
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  رقم الهاتف
                </label>

                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="01xxxxxxxxx"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength="11"
                  className={
                    errors.phone
                      ? "input-error"
                      : ""
                  }
                  disabled={loading}
                />

                {errors.phone && (
                  <span className="error-message">
                    {errors.phone}
                  </span>
                )}
              </div>

            </div>

            {/* EMAIL + GRADE */}
            <div className="form-row">

              <div className="form-group">
                <label htmlFor="email">
                  البريد الإلكتروني
                </label>

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
                />

                {errors.email && (
                  <span className="error-message">
                    {errors.email}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="gradeLevel">
                  الصف الدراسي
                </label>

                <select
                  id="gradeLevel"
                  name="gradeLevel"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  className={
                    errors.gradeLevel
                      ? "input-error"
                      : ""
                  }
                  disabled={loading}
                >
                  <option value="">
                    اختر الصف الدراسي
                  </option>

                  {grades.map((grade) => (
                    <option
                      key={grade.value}
                      value={grade.value}
                    >
                      {grade.label}
                    </option>
                  ))}
                </select>

                {errors.gradeLevel && (
                  <span className="error-message">
                    {errors.gradeLevel}
                  </span>
                )}
              </div>

            </div>

            {/* SYSTEM + DIVISION / TRACK */}
            <div className="form-row">
              {/* النظام الدراسي */}
              {!isThirdSecondary ? (
                <div className="form-group">
                  <label htmlFor="educationSystem">
                    النظام الدراسي
                  </label>

                  <select
                    id="educationSystem"
                    name="educationSystem"
                    value={formData.educationSystem}
                    onChange={handleChange}
                    className={
                      errors.educationSystem
                        ? "input-error"
                        : ""
                    }
                    disabled={
                      !formData.gradeLevel ||
                      loading
                    }
                  >
                    <option value="">
                      اختر النظام الدراسي
                    </option>

                    {systems.map((system) => (
                      <option
                        key={system.value}
                        value={system.value}
                      >
                        {system.label}
                      </option>
                    ))}
                  </select>

                  {errors.educationSystem && (
                    <span className="error-message">
                      {errors.educationSystem}
                    </span>
                  )}
                </div>
              ) : (
                // تالتة ثانوي لا تحتاج اختيار النظام
                <div className="form-group">
                  <label>النظام الدراسي</label>

                  <input
                    type="text"
                    value="النظام العام"
                    disabled
                  />
                </div>
              )}
              <div className="form-group">

                {/* تالتة ثانوي */}
                {isThirdSecondary && (
                  <>
                    <label htmlFor="division">
                      الشعبة
                    </label>

                    <select
                      id="division"
                      name="division"
                      value={formData.division}
                      onChange={handleChange}
                      className={
                        errors.division
                          ? "input-error"
                          : ""
                      }
                      disabled={loading}
                    >
                      <option value="">
                        اختر الشعبة
                      </option>

                      {generalDivisions.map(
                        (division) => (
                          <option
                            key={division}
                            value={division}
                          >
                            {division}
                          </option>
                        )
                      )}
                    </select>

                    {errors.division && (
                      <span className="error-message">
                        {errors.division}
                      </span>
                    )}
                  </>
                )}

                {/* تانية بكالوريا */}
                {isSecondBaccalaureate && (
                  <>
                    <label htmlFor="track">
                      المسار
                    </label>

                    <select
                      id="track"
                      name="track"
                      value={formData.track}
                      onChange={handleChange}
                      className={
                        errors.track
                          ? "input-error"
                          : ""
                      }
                      disabled={loading}
                    >
                      <option value="">
                        اختر المسار
                      </option>

                      {baccalaureateTracks.map(
                        (item) => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        )
                      )}
                    </select>

                    {errors.track && (
                      <span className="error-message">
                        {errors.track}
                      </span>
                    )}
                  </>
                )}

                {/* أولى بكالوريا */}
                {formData.gradeLevel ===
                  "first_secondary" &&
                  isBaccalaureate && (
                    <>
                      <label>
                        المسار
                      </label>

                      <input
                        type="text"
                        value="سنة تمهيدية"
                        disabled
                      />
                    </>
                  )}

                {/* أولى / تانية عام */}
                {!isThirdSecondary &&
                  !isBaccalaureate && (
                    <>
                      <label htmlFor="division">
                        الشعبة
                      </label>

                      <select
                        id="division"
                        name="division"
                        value={formData.division}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="">
                          اختر الشعبة
                        </option>

                        {generalDivisions.map(
                          (division) => (
                            <option
                              key={division}
                              value={division}
                            >
                              {division}
                            </option>
                          )
                        )}
                      </select>
                    </>
                  )}

              </div>

            </div>

            {/* PASSWORD + CONFIRM */}
            <div className="form-row">

              <div className="form-group">
                <label htmlFor="password">
                  كلمة المرور
                </label>

                <div className="password-input-wrapper">

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="8 أحرف على الأقل"
                    value={formData.password}
                    onChange={handleChange}
                    className={
                      errors.password
                        ? "input-error"
                        : ""
                    }
                    disabled={loading}
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

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  تأكيد كلمة المرور
                </label>

                <div className="password-input-wrapper">

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    placeholder="أعد كتابة كلمة المرور"
                    value={
                      formData.confirmPassword
                    }
                    onChange={handleChange}
                    className={
                      errors.confirmPassword
                        ? "input-error"
                        : ""
                    }
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (prev) => !prev
                      )
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>

                </div>

                {errors.confirmPassword && (
                  <span className="error-message">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="signup-submit"
              disabled={loading}
            >
              {loading
                ? "جاري إنشاء الحساب..."
                : "إنشاء الحساب"}
            </button>

          </form>

          {/* FOOTER */}
          <div className="signup-footer">
            <span>
              عندك حساب بالفعل؟
            </span>

            <Link to="/Login">
              تسجيل الدخول
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
};

export default SignUp;