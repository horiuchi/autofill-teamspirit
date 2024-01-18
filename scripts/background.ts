chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
  // console.log(`${tab.title}: ${tab.url}, ${tab.id}`);
  const tabId = tab.id;
  if (tabId == null) {
    return;
  }

  chrome.scripting
    .executeScript({
      target: { tabId, allFrames: true },
      func: findCell,
    })
    .catch((e) => {
      console.error(e);
    });
});

async function findCell() {
  const startTime = "10:00";
  const endTime = "18:30";
  const workTime = (isFriday: boolean) =>
    isFriday
      ? {
          "G&A": "0:30",
          Dev: "7:00",
        }
      : {
          Dev: "7:30",
        };

  async function sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function waitForPresent(target: Node, f: () => boolean): Promise<void> {
    return new Promise<void>((resolve) => {
      if (f()) {
        resolve();
      } else {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (f()) {
              observer.disconnect();
              resolve();
            }
          }
        });
        observer.observe(target, { attributes: true });
      }
    });
  }

  async function waitBusy(doc: Document) {
    const $el = await waitElement(doc, "BusyWait");
    await waitForPresent($el, () => $el.style.display !== "none");
    await waitForPresent($el, () => $el.style.display === "none");
  }

  async function waitElement<T extends HTMLElement = HTMLElement>(
    doc: Document,
    id: string
  ): Promise<T> {
    return new Promise<T>((resolve) => {
      const $el = doc.getElementById(id) as T;
      if ($el != null) {
        resolve($el);
      } else {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            const $el = doc.getElementById(id) as T;
            if ($el != null) {
              observer.disconnect();
              resolve($el);
            }
          }
        });
        observer.observe(doc, { childList: true, subtree: true });
      }
    });
  }

  async function fillWorkTime($table: HTMLElement): Promise<void> {
    const $rows = $table.querySelectorAll("tr.days.odd, tr.days.even");
    for (const $row of Array.from($rows).filter(
      (e) => e.getAttribute("style") == null
    )) {
      const $cell = $row.querySelector<HTMLElement>("td.day_time0");
      if ($cell != null) {
        // console.log("cell found!", $cell);
        $cell.click();

        const start = await waitElement<HTMLInputElement>(
          document,
          "startTime"
        );
        const end = await waitElement<HTMLInputElement>(document, "endTime");
        const submit = await waitElement(document, "dlgInpTimeOk");

        start.value = startTime;
        end.value = endTime;
        submit.click();

        await waitBusy(document);
        await sleep(100);
      }
    }
  }

  async function fillDetailTime($jobTable: HTMLElement): Promise<void> {
    function isFriday($cell: HTMLElement): boolean {
      const content = $cell
        .closest<HTMLElement>(".days")
        ?.querySelector(".vweek")
        ?.textContent?.trim();
      return content === "金";
    }

    function createJobMap($table: HTMLElement) {
      const prefix = "empWorkSeq";

      const result: Record<string, string> = {};
      const $rows = $table.querySelectorAll<HTMLElement>("div.name");
      for (const $row of Array.from($rows)) {
        const name = $row.textContent?.trim() ?? "";
        const $input = $row.parentElement?.querySelector(
          `input[id^=${prefix}]`
        );
        if ($input == null) {
          console.warn("input not found!", $row);
          continue;
        }
        const id = $input.id.substring(prefix.length);
        result[name] = id;
      }
      return result;
    }

    let jobMap: Record<string, string> | null = null;
    while (true) {
      const $cell = $jobTable.querySelector<HTMLElement>("td.vjob div.png-add");
      if ($cell == null) {
        break;
      }

      const isFridayCell = isFriday($cell);
      // console.log("cell found!", isFridayCell);
      // console.log($cell);
      $cell.click();

      const work = workTime(isFridayCell);
      const $table = await waitElement(document, "empWorkTableBody");
      if (jobMap == null) {
        jobMap = createJobMap($table);
      }

      const $button = document.getElementById("empWorkOk");
      if ($button == null) {
        console.error("button not found!");
        continue;
      }
      for (const [name, time] of Object.entries(work)) {
        const id = jobMap[name];
        if (id == null) {
          console.warn("id not found!", name);
          continue;
        }

        const $lock = document.getElementById(`empWorkLock${id}`);
        if ($lock == null) {
          console.warn("lock element not found!", name);
          continue;
        }
        $lock.click();

        const $input = document.getElementById(
          `empInputTime${id}`
        ) as HTMLInputElement;
        if ($input == null) {
          console.warn("input element not found!", name);
          continue;
        }
        await waitForPresent(document, () => $input.style.display !== "none");

        $input.value = time;
      }
      $button.click();

      await waitBusy(document);
      await sleep(100);
    }
  }

  try {
    const $tableBody = document.getElementById("mainTableBody");
    if ($tableBody != null) {
      await fillWorkTime($tableBody);
      await fillDetailTime($tableBody);
    }
  } catch (e) {
    console.error(e);
  }
}
