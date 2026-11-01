import "i18next";
import type en from "../locales/en.json";

// Translation keys are checked against the English file: a typo fails the build.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
