// Recursively widens every string leaf of a message tree to `string`, preserving
// its key structure. Used to enforce that translated trees share the exact
// nesting and key names of the canonical English tree, without forcing their
// leaf values to match English text.
type MessageShape<T> = T extends string
  ? string
  : { [K in keyof T]: MessageShape<T[K]> };

const en = {
  title: {
    name: "9dle",
    summary:
      "A daily multiplication puzzle. Spell each row's answer with tiles from your hand. A correct answer pays the digits printed on its row, and your hand holds five. Par is the best score the table allows.",
    more: "More",
  },
  language: {
    groupLabel: "Language",
  },
  howToPlay: {
    selecting:
      "Click or tap an inventory tile to place it in the next empty answer slot. Click a filled slot to return that tile to your inventory.",
    slots:
      "Answer slots fill in the order you select tiles: the first tile you choose fills the leftmost slot, so selection order determines the number you submit.",
    correct: "A correct answer spends its tiles and pays the digits printed on its row.",
    incorrect:
      "An incorrect answer removes the tiles you spent and grants no reward.",
    capacity: "Your hand holds at most five tiles.",
    overflow:
      "If a pay would push your hand past five tiles, choose one tile to discard before play continues.",
    progress:
      "Round shows which row of the table is current, score counts correct answers, and streak counts consecutive correct answers. The table ends after row 8, or sooner once you hold fewer tiles than the next answer needs.",
    keyboard:
      "Press a digit key to select a matching tile or, during a discard, to mark it and complete the discard, Backspace to return the most recently selected tile, Escape to clear your selection, Enter to submit or continue, and R to play again once the run ends.",
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
  },
  gameOver: {
    reason: "Not enough tiles left to answer.",
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
    name: "구들",
    summary:
      "매일 한 판, 곱셈 퍼즐. 손에 든 숫자 타일로 각 줄의 답을 만드세요. 정답이면 그 줄에 적힌 숫자 타일을 받고, 손에는 다섯 개까지 들 수 있습니다. 목표는 이 판에서 낼 수 있는 최고 점수입니다.",
    more: "더 보기",
  },
  language: {
    groupLabel: "언어",
  },
  howToPlay: {
    selecting:
      "인벤토리 타일을 클릭하거나 탭하면 다음 빈 정답 칸에 놓입니다. 채워진 칸을 클릭하면 타일이 인벤토리로 돌아갑니다.",
    slots:
      "정답 칸은 선택한 순서대로 채워집니다. 먼저 선택한 타일이 맨 왼쪽 칸에 들어가므로 선택 순서가 제출할 숫자를 결정합니다.",
    correct: "정답이면 사용한 타일이 빠지고 그 줄에 적힌 숫자 타일을 받습니다.",
    incorrect: "오답이면 사용한 타일이 보상 없이 사라집니다.",
    capacity: "손에는 타일을 최대 다섯 개까지 들 수 있습니다.",
    overflow: "받은 타일로 손이 다섯 개를 넘으면, 계속하기 전에 버릴 타일 1개를 선택해야 합니다.",
    progress:
      "라운드는 지금 풀고 있는 판의 줄을, 점수는 정답 횟수를, 연속 정답은 이어지는 정답 횟수를 나타냅니다. 판은 8번째 줄을 풀면 끝나고, 다음 답에 필요한 타일보다 보유한 타일이 적어지면 더 일찍 끝납니다.",
    keyboard:
      "숫자 키를 누르면 일치하는 타일을 선택하거나, 버리기 중에는 타일을 표시해 바로 버리기를 완료하며, Backspace 키로 가장 최근에 선택한 타일을 되돌리고, Escape 키로 선택을 지우며, Enter 키로 제출하거나 다음으로 진행하고, 게임이 끝나면 R 키로 다시 시작합니다.",
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
  },
  gameOver: {
    reason: "답을 만들 타일이 부족합니다.",
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
