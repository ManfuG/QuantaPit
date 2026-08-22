export interface Question {
  text: string
  answer: number
}

export interface AnswerRecord {
  question: Question
  given: string
  correct: boolean
  responseTimeMs: number
}

export interface Results {
  records: AnswerRecord[]
  elapsedMs: number
}
