import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Playlist, PlaylistItem, Content } from '../lib/types';

// ── usePlaylists ───────────────────────────────────────────────────────────

export function usePlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) {
      setPlaylists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    setPlaylists(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return { playlists, loading, refetch: fetchPlaylists };
}

// ── usePlaylistItems ───────────────────────────────────────────────────────

export function usePlaylistItems(playlistId: string) {
  const [items, setItems] = useState<(PlaylistItem & { content: Content })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playlistId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('playlist_items')
        .select('*, content(*)')
        .eq('playlist_id', playlistId)
        .order('sort_order', { ascending: true });

      if (!cancelled) {
        setItems((data as (PlaylistItem & { content: Content })[]) ?? []);
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [playlistId]);

  return { items, loading };
}

// ── Mutation helpers ───────────────────────────────────────────────────────

export async function createPlaylist(userId: string, name: string): Promise<Playlist> {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: userId, name, is_public: false })
    .select()
    .single();

  if (error) throw error;
  return data as Playlist;
}

export async function addToPlaylist(playlistId: string, contentId: string): Promise<void> {
  // Determine next sort_order
  const { data: existing } = await supabase
    .from('playlist_items')
    .select('sort_order')
    .eq('playlist_id', playlistId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase
    .from('playlist_items')
    .insert({ playlist_id: playlistId, content_id: contentId, sort_order: nextOrder });

  if (error) throw error;
}

export async function removeFromPlaylist(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId);

  if (error) throw error;
}

export async function ensureFavourites(userId: string): Promise<Playlist> {
  // Check if a "Favourites" playlist already exists
  const { data: existing, error: fetchError } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', userId)
    .eq('name', 'Favourites')
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing as Playlist;

  // Create it
  return createPlaylist(userId, 'Favourites');
}
