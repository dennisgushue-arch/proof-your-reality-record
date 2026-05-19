
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Cases
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases own select" ON public.cases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cases own insert" ON public.cases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cases own update" ON public.cases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cases own delete" ON public.cases FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER cases_touch BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Incidents
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT,
  people_involved JSONB DEFAULT '[]'::jsonb,
  raw_narrative TEXT NOT NULL DEFAULT '',
  neutral_summary TEXT,
  emotional_language_removed TEXT,
  evidence_quality_score INTEGER,
  ai_analysis JSONB,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents own select" ON public.incidents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "incidents own insert" ON public.incidents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incidents own update" ON public.incidents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "incidents own delete" ON public.incidents FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER incidents_touch BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX incidents_case_idx ON public.incidents(case_id, occurred_at DESC);

-- Evidence items
CREATE TABLE public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filename TEXT,
  storage_path TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ev own select" ON public.evidence_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ev own insert" ON public.evidence_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ev own update" ON public.evidence_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ev own delete" ON public.evidence_items FOR DELETE USING (auth.uid() = user_id);

-- Reminders
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rem own select" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rem own insert" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rem own update" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rem own delete" ON public.reminders FOR DELETE USING (auth.uid() = user_id);
