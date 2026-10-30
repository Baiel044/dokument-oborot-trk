import { lazy } from "react";

const RELOAD_FLAG = "eduflow-chunk-reload";

function readFlag() {
  try {
    return sessionStorage.getItem(RELOAD_FLAG);
  } catch {
    return "1";
  }
}

function writeFlag(value) {
  try {
    if (value) {
      sessionStorage.setItem(RELOAD_FLAG, value);
    } else {
      sessionStorage.removeItem(RELOAD_FLAG);
    }
  } catch {
    // Storage blocked: just skip the automatic reload.
  }
}

/**
 * React.lazy that survives a failed chunk download (a deploy in progress, a flaky network):
 * it retries once, then reloads the page once. If that still fails, the error reaches the
 * nearest error boundary instead of looping.
 */
export function lazyWithReload(importer) {
  return lazy(async () => {
    try {
      const module = await importer();
      writeFlag("");
      return module;
    } catch (firstError) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      try {
        const module = await importer();
        writeFlag("");
        return module;
      } catch {
        if (!readFlag()) {
          writeFlag("1");
          window.location.reload();
          return new Promise(() => {});
        }
        throw firstError;
      }
    }
  });
}
