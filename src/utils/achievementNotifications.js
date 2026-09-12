import Swal from "sweetalert2";
import "./achievementNotifications.css";

export const showAchievementAlert = (achievement) => {
  if (!achievement) return;

  Swal.fire({
    toast: true,

    position: "top-left",

    width: "380px",

    padding: "0",

    showConfirmButton: false,
    showCloseButton: true,

    timer: 10000,
    timerProgressBar: true,

    backdrop: false,

    allowOutsideClick: true,
    allowEscapeKey: true,

    customClass: {
      container: "achievement-toast-container",
      popup: "achievement-toast",
      closeButton: "achievement-toast-close",
      timerProgressBar: "achievement-toast-progress",
    },

    html: `
      <div class="achievement-toast-content">

        <div class="achievement-toast-icon">
          ${achievement.icon || "🏆"}
        </div>

        <div class="achievement-toast-info">

          <div class="achievement-toast-label">
            🏆 إنجاز جديد
          </div>

          <div class="achievement-toast-title">
            ${achievement.title || "إنجاز جديد"}
          </div>

          ${
            achievement.description
              ? `
                <div class="achievement-toast-description">
                  ${achievement.description}
                </div>
              `
              : ""
          }

          ${
            achievement.reward_points
              ? `
                <div class="achievement-toast-points">
                  ⭐ +${achievement.reward_points} نقطة
                </div>
              `
              : ""
          }

        </div>

      </div>
    `,
  });
};

export const showLevelUpAlert = (level) => {
  if (!level) return;

  Swal.fire({
    toast: true,

    position: "top-left",

    width: "380px",

    padding: "0",

    showConfirmButton: false,
    showCloseButton: true,

    timer: 10000,
    timerProgressBar: true,

    backdrop: false,

    allowOutsideClick: true,
    allowEscapeKey: true,

    customClass: {
      container: "achievement-toast-container",
      popup: "level-up-toast",
      closeButton: "level-up-toast-close",
      timerProgressBar: "level-up-toast-progress",
    },

    html: `
      <div class="level-up-toast-content">

        <div class="level-up-toast-icon">
          ${level.icon || "🚀"}
        </div>

        <div class="level-up-toast-info">

          <div class="level-up-toast-label">
            🚀 مستوى جديد!
          </div>

          <div class="level-up-toast-level">
            المستوى ${level.level_number}
          </div>

          <div class="level-up-toast-title">
            ${level.title || "مستوى جديد"}
          </div>

          ${
            level.description
              ? `
                <div class="level-up-toast-description">
                  ${level.description}
                </div>
              `
              : ""
          }

        </div>

      </div>
    `,
  });
};