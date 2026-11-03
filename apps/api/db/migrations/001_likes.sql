-- 001 · Likes : chaque Pokémon de la wishlist peut être « aimé ».
-- Les lignes déjà présentes sont gardées telles quelles, avec 0 like.
alter table public.wishlist
  add column likes integer not null default 0 check (likes >= 0);
