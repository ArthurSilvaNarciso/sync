import api from './api';
import { Event, EventComment } from '../types';

export const eventsService = {
  getNearby: async (lat: number, lng: number, radius = 20, sport?: string): Promise<Event[]> => {
    let url = `/events/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
    if (sport) url += `&sport=${sport}`;
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<Event> => {
    const response = await api.post('/events', data);
    return response.data;
  },

  join: async (id: string): Promise<void> => {
    await api.post(`/events/${id}/join`);
  },

  leave: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}/leave`);
  },

  getComments: async (eventId: string, page = 1, limit = 20): Promise<EventComment[]> => {
    const response = await api.get(`/events/${eventId}/comments?page=${page}&limit=${limit}`);
    return response.data;
  },

  addComment: async (eventId: string, content: string): Promise<EventComment> => {
    const response = await api.post(`/events/${eventId}/comments`, { content });
    return response.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/events/comments/${commentId}`);
  },
};
