// Question text extracted from the PDFs keeps the paper's hard line breaks mid-sentence.
// Join a line onto the previous one when it continues the sentence (starts lowercase),
// but keep list items such as "a." / "ii)" and every other line break intact.
const CONTINUATION = /([^\n])\n(?=[a-z])(?![a-z][.)]\s)(?!(?:i{1,3}|iv|vi{0,3}|ix|x)[.)]\s)/g

export const reflowQuestion = (text: string) => text.replace(CONTINUATION, "$1 ")
