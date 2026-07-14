export type Topic = {
  id: number;
  name: string;
  order: number;
};

export type QuizQuestion = {
  id: string;
  stem: string;
  choices: string[];
  difficulty: number;
};

export type SubmitResult = {
  is_correct: boolean;
  correct_index: number;
  explanation: string;
};

export type TopicStat = {
  topic_id: number;
  topic_name: string;
  topic_order: number;
  total_attempts: number;
  correct_attempts: number;
  question_count: number;
};
