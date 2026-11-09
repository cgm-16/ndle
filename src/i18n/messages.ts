// Recursively widens every string leaf of a message tree to `string`, preserving
// its key structure. Used to enforce that translated trees share the exact
// nesting and key names of the canonical English tree, without forcing their
// leaf values to match English text.
type MessageShape<T> = T extends string
  ? string
  : { [K in keyof T]: MessageShape<T[K]> };

const en = {
  title: {
    name: "ozterisk",
    summary:
      "Solve multiplication problems using limited digit tiles. Correct answers replace the tiles you spend and grant one extra tile. Incorrect answers consume your tiles without a reward. Keep your inventory balanced and survive as long as possible.",
    more: "More",
    mode: "Mode",
  },
  mode: {
    endless: "Endless",
    endlessHint: "Ten sockets, no end",
    puzzle: "Puzzle",
    puzzleHint: "Every tile face up",
  },
  language: {
    groupLabel: "Language",
  },
  howToPlay: {
    selecting:
      "Click or tap an inventory tile to place it in the next empty answer slot. Click a filled slot to return that tile to your inventory.",
    slots:
      "Answer slots fill in the order you select tiles: the first tile you choose fills the leftmost slot, so selection order determines the number you submit.",
    correct:
      "A correct answer replaces the tiles you spent and grants one extra tile.",
    incorrect:
      "An incorrect answer removes the tiles you spent and grants no reward.",
    capacity: "Your inventory holds at most ten tiles.",
    overflow:
      "If a reward would push your inventory past ten tiles, you must choose tiles to discard before play continues.",
    progress:
      "Round shows which equation is currently on screen, score counts correct answers, and streak counts consecutive correct answers. Rounds played counts every equation you have submitted, correct or incorrect. The run ends once you hold fewer tiles than the next answer requires.",
    keyboard:
      "Press a digit key to select a matching tile or, during a discard, to mark it and complete the discard, Backspace to return the most recently selected tile, Escape to clear your selection, Enter to submit or continue, and R to play again once the run ends.",
    puzzle:
      "Puzzle deals five tiles and eight equations face up, each printed with the tiles it pays. A correct answer takes its row's tiles, and your hand holds five. Par is the best score the table allows. A wrong answer is a legal move.",
  },
  action: {
    start: "Start Run",
    submit: "Submit",
    clear: "Clear",
    next: "Next Round",
    playAgain: "Play Again",
    share: "Share",
    copy: "Copy Result",
  },
  hud: {
    score: "Score",
    streak: "Streak",
    round: "Round",
    capacity: "Capacity",
    // The pip row is a role="img"; this is its accessible name. It has to be a
    // localised template rather than an interpolated "of", which rendered the
    // Korean name as "용량 10 of 10".
    capacityStatus: "{label} {held} of {total}",
    par: "Par",
  },
  // Puzzle's table. Each row is one accessible string; the pay is joined by
  // Intl.ListFormat in the current language, so no "and" is written here.
  ledger: {
    label: "Table",
    row: "Row {row}, {left} × {right}, pays {pay}",
    answered: "answered",
    missed: "missed",
  },
  result: {
    correct: "Correct",
    incorrect: "Incorrect",
    submitted: "Your answer: {value}",
    answer: "Correct answer: {value}",
    rewards: "Received {count} tiles",
  },
  overflow: {
    instructionOne: "Choose a tile to discard.",
    instruction: "Choose {count} tiles to discard.",
  },
  gameOver: {
    title: "Game Over",
    reason: "Not enough tiles left to answer.",
    rounds: "Rounds played",
    longestStreak: "Longest streak",
    restartHint: "Press R to play again",
    parTitle: "Made par",
    shortTitle: "{short} short of par",
    tableReason: "All eight rows played.",
  },
  share: {
    copied: "Result copied.",
    failed: "Could not share or copy the result.",
    puzzleAsk: "Can you make par?",
  },
  answerSlot: {
    filled: "Answer slot {position}: {digit}",
    empty: "Answer slot {position}: empty",
  },
  tile: {
    digitLabel: "Digit {digit}",
    newLabel: "New tile",
    discardLabel: "Marked for discard",
  },
} as const;

const ko = {
  title: {
    name: "ozterisk",
    summary:
      "제한된 숫자 타일로 곱셈 문제를 푸세요. 정답을 맞히면 사용한 타일을 보충하고 타일 한 개를 추가로 받습니다. 오답에 사용한 타일은 보상 없이 사라집니다. 타일 구성을 관리하며 최대한 오래 살아남으세요.",
    more: "더 보기",
    mode: "모드",
  },
  mode: {
    endless: "엔드리스",
    endlessHint: "열 칸, 끝없이",
    puzzle: "묘수풀이",
    puzzleHint: "모든 타일을 펼쳐 놓고",
  },
  language: {
    groupLabel: "언어",
  },
  howToPlay: {
    selecting:
      "인벤토리 타일을 클릭하거나 탭하면 다음 빈 정답 칸에 놓입니다. 채워진 칸을 클릭하면 타일이 인벤토리로 돌아갑니다.",
    slots:
      "정답 칸은 선택한 순서대로 채워집니다. 먼저 선택한 타일이 맨 왼쪽 칸에 들어가므로 선택 순서가 제출할 숫자를 결정합니다.",
    correct: "정답이면 사용한 타일을 보충하고 타일 한 개를 추가로 받습니다.",
    incorrect: "오답이면 사용한 타일이 보상 없이 사라집니다.",
    capacity: "인벤토리는 최대 열 개의 타일까지 보관할 수 있습니다.",
    overflow: "보상으로 인벤토리가 열 개를 초과하면, 계속하기 전에 버릴 타일을 선택해야 합니다.",
    progress:
      "라운드는 현재 화면에 표시된 문제의 번호이며, 점수는 정답 횟수를, 연속 정답은 이어지는 정답 횟수를 나타냅니다. 진행한 라운드는 정답과 오답을 포함해 지금까지 제출한 문제 수를 나타냅니다. 다음 정답에 필요한 타일보다 보유한 타일이 적어지면 게임이 종료됩니다.",
    keyboard:
      "숫자 키를 누르면 일치하는 타일을 선택하거나, 버리기 중에는 타일을 표시해 바로 버리기를 완료하며, Backspace 키로 가장 최근에 선택한 타일을 되돌리고, Escape 키로 선택을 지우며, Enter 키로 제출하거나 다음으로 진행하고, 게임이 끝나면 R 키로 다시 시작합니다.",
    puzzle:
      "묘수풀이는 타일 다섯 개와 문제 여덟 개를 모두 펼쳐 놓고 시작하며, 문제마다 받을 타일이 적혀 있습니다. 정답을 맞히면 그 줄의 타일을 받고, 손에는 다섯 개까지 보관합니다. 목표는 이 판에서 낼 수 있는 가장 높은 점수입니다. 오답도 둘 수 있는 한 수입니다.",
  },
  action: {
    start: "게임 시작",
    submit: "제출",
    clear: "지우기",
    next: "다음 라운드",
    playAgain: "다시 하기",
    share: "공유",
    copy: "결과 복사",
  },
  hud: {
    score: "점수",
    streak: "연속 정답",
    round: "라운드",
    capacity: "용량",
    capacityStatus: "{label} {total} 중 {held}",
    par: "목표",
  },
  ledger: {
    label: "판",
    row: "{row}번째 줄, {left} × {right}, 보상 {pay}",
    answered: "정답",
    missed: "오답",
  },
  result: {
    correct: "정답",
    incorrect: "오답",
    submitted: "제출한 답: {value}",
    answer: "정답: {value}",
    rewards: "타일 {count}개 획득",
  },
  overflow: {
    instructionOne: "버릴 타일 1개를 선택하세요.",
    instruction: "버릴 타일 {count}개를 선택하세요.",
  },
  gameOver: {
    title: "게임 종료",
    reason: "답을 만들 타일이 부족합니다.",
    rounds: "진행한 라운드",
    longestStreak: "최장 연속 정답",
    restartHint: "R 키를 눌러 다시 하기",
    parTitle: "목표 달성",
    shortTitle: "목표까지 {short}점 부족",
    tableReason: "여덟 줄을 모두 풀었습니다.",
  },
  share: {
    copied: "결과를 복사했습니다.",
    failed: "결과를 공유하거나 복사하지 못했습니다.",
    puzzleAsk: "목표를 달성할 수 있나요?",
  },
  answerSlot: {
    filled: "정답 칸 {position}: {digit}",
    empty: "정답 칸 {position}: 비어 있음",
  },
  tile: {
    digitLabel: "숫자 {digit}",
    newLabel: "새 타일",
    discardLabel: "버릴 타일로 표시됨",
  },
} as const satisfies MessageShape<typeof en>;

export const messages = { en, ko } as const;

export type MessageTree = typeof en;
