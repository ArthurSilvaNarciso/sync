import api from './api';

export interface ActivityCommentReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface ActivityCommentItem {
  id: string;
  activity_id: string;
  user_id: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  content: string;
  mentioned_user_ids: string[];
  reactions: ActivityCommentReaction[];
  createdAt: string;
}

export const ALLOWED_COMMENT_REACTIONS = ['❤️', '🔥', '💪', '🚀', '👏', '🙌', '😂', '🎉'] as const;
export type AllowedCommentReaction = (typeof ALLOWED_COMMENT_REACTIONS)[number];

export const activityCommentsApi = {
  list: (activityId: string) =>
    api.get<ActivityCommentItem[]>(`/activities/${activityId}/comments`).then((r) => r.data),

  add: (activityId: string, content: string) =>
    api.post<ActivityCommentItem>(`/activities/${activityId}/comments`, { content }).then((r) => r.data),

  remove: (commentId: string) =>
    api.delete(`/activities/comments/${commentId}`).then((r) => r.data),

  toggleReaction: (commentId: string, emoji: AllowedCommentReaction) =>
    api
      .post<{ added: boolean; count: number; emoji: string }>(
        `/activities/comments/${commentId}/reactions`,
        { emoji },
      )
      .then((r) => r.data),

  listReactions: (commentId: string) =>
    api
      .get<
        Array<{
          id: string;
          emoji: string;
          user_id: string;
          user: { id: string; name: string; avatarUrl?: string | null };
          createdAt: string;
        }>
      >(`/activities/comments/${commentId}/reactions`)
      .then((r) => r.data),
};

/**
 * Faz parse de @mentions num texto, retornando partes alternadas {type: 'text'|'mention', value}.
 * Útil pra renderizar tokens estilizados.
 */
export function parseCommentTokens(text: string): Array<{ type: 'text' | 'mention' | 'hashtag'; value: string }> {
  if (!text) return [];
  const tokens: Array<{ type: 'text' | 'mention' | 'hashtag'; value: string }> = [];
  const regex = /(@[a-zA-Z0-9._]{3,30}|#\w{2,30})/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    if (m[0].startsWith('@')) {
      tokens.push({ type: 'mention', value: m[0].slice(1) });
    } else {
      tokens.push({ type: 'hashtag', value: m[0].slice(1) });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}
