-- Per-user chart instrument preferences (which symbol is loaded in each chart slot)
CREATE TABLE IF NOT EXISTS public.chart_preferences (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot text NOT NULL,
  symbol text NOT NULL,
  label text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

ALTER TABLE public.chart_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chart preferences"
  ON public.chart_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chart preferences"
  ON public.chart_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chart preferences"
  ON public.chart_preferences FOR UPDATE USING (auth.uid() = user_id);
