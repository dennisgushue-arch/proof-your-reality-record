CREATE TABLE public.case_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  mention_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_entities_type_check CHECK (entity_type IN (
    'person',
    'location',
    'organization',
    'school',
    'address',
    'phone',
    'email',
    'url',
    'vehicle',
    'date',
    'court',
    'other'
  )),
  CONSTRAINT case_entities_id_case_user_unique UNIQUE (id, case_id, user_id),
  CONSTRAINT case_entities_unique_normalized UNIQUE (case_id, entity_type, normalized_name)
);

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_id_case_user_unique UNIQUE (id, case_id, user_id);

ALTER TABLE public.evidence_items
  ADD CONSTRAINT evidence_items_id_incident_user_unique UNIQUE (id, incident_id, user_id);

CREATE INDEX case_entities_case_id_idx ON public.case_entities(case_id);
CREATE INDEX case_entities_user_id_idx ON public.case_entities(user_id);
CREATE INDEX case_entities_entity_type_idx ON public.case_entities(entity_type);
CREATE INDEX case_entities_normalized_name_idx ON public.case_entities(normalized_name);
CREATE INDEX case_entities_mention_count_idx ON public.case_entities(mention_count DESC);

CREATE TRIGGER case_entities_touch
  BEFORE UPDATE ON public.case_entities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.entity_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.case_entities(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  evidence_item_id UUID REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  source_field TEXT,
  matched_text TEXT NOT NULL,
  context_excerpt TEXT,
  confidence TEXT,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entity_mentions_confidence_check CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low')),
  CONSTRAINT entity_mentions_entity_same_case_user_fk FOREIGN KEY (entity_id, case_id, user_id)
    REFERENCES public.case_entities(id, case_id, user_id) ON DELETE CASCADE,
  CONSTRAINT entity_mentions_incident_same_case_user_fk FOREIGN KEY (incident_id, case_id, user_id)
    REFERENCES public.incidents(id, case_id, user_id) ON DELETE CASCADE,
  CONSTRAINT entity_mentions_evidence_same_incident_user_fk FOREIGN KEY (evidence_item_id, incident_id, user_id)
    REFERENCES public.evidence_items(id, incident_id, user_id) ON DELETE CASCADE,
  CONSTRAINT entity_mentions_unique_match UNIQUE (entity_id, incident_id, matched_text)
);

CREATE INDEX entity_mentions_entity_id_idx ON public.entity_mentions(entity_id);
CREATE INDEX entity_mentions_incident_id_idx ON public.entity_mentions(incident_id);
CREATE INDEX entity_mentions_case_id_idx ON public.entity_mentions(case_id);
CREATE INDEX entity_mentions_occurred_at_idx ON public.entity_mentions(occurred_at);

CREATE TABLE public.entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES public.case_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.case_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 1,
  confidence TEXT,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entity_relationships_no_self_check CHECK (source_entity_id <> target_entity_id),
  CONSTRAINT entity_relationships_confidence_check CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low')),
  CONSTRAINT entity_relationships_source_same_case_user_fk FOREIGN KEY (source_entity_id, case_id, user_id)
    REFERENCES public.case_entities(id, case_id, user_id) ON DELETE CASCADE,
  CONSTRAINT entity_relationships_target_same_case_user_fk FOREIGN KEY (target_entity_id, case_id, user_id)
    REFERENCES public.case_entities(id, case_id, user_id) ON DELETE CASCADE,
  CONSTRAINT entity_relationships_unique_type UNIQUE (case_id, source_entity_id, target_entity_id, relationship_type)
);

CREATE INDEX entity_relationships_case_id_idx ON public.entity_relationships(case_id);
CREATE INDEX entity_relationships_source_entity_idx ON public.entity_relationships(source_entity_id);
CREATE INDEX entity_relationships_target_entity_idx ON public.entity_relationships(target_entity_id);

CREATE TRIGGER entity_relationships_touch
  BEFORE UPDATE ON public.entity_relationships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.case_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case entities own select" ON public.case_entities
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "case entities own insert" ON public.case_entities
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "case entities own update" ON public.case_entities
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "case entities own delete" ON public.case_entities
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );

CREATE POLICY "entity mentions own select" ON public.entity_mentions
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "entity mentions own insert" ON public.entity_mentions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities ce WHERE ce.id = entity_id AND ce.case_id = case_id AND ce.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.case_id = case_id AND i.user_id = auth.uid())
    AND (
      evidence_item_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.evidence_items ev
        JOIN public.incidents ei ON ei.id = ev.incident_id
        WHERE ev.id = evidence_item_id
          AND ev.incident_id = incident_id
          AND ev.user_id = auth.uid()
          AND ei.case_id = case_id
          AND ei.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "entity mentions own update" ON public.entity_mentions
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities ce WHERE ce.id = entity_id AND ce.case_id = case_id AND ce.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.case_id = case_id AND i.user_id = auth.uid())
    AND (
      evidence_item_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.evidence_items ev
        JOIN public.incidents ei ON ei.id = ev.incident_id
        WHERE ev.id = evidence_item_id
          AND ev.incident_id = incident_id
          AND ev.user_id = auth.uid()
          AND ei.case_id = case_id
          AND ei.user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities ce WHERE ce.id = entity_id AND ce.case_id = case_id AND ce.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.case_id = case_id AND i.user_id = auth.uid())
    AND (
      evidence_item_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.evidence_items ev
        JOIN public.incidents ei ON ei.id = ev.incident_id
        WHERE ev.id = evidence_item_id
          AND ev.incident_id = incident_id
          AND ev.user_id = auth.uid()
          AND ei.case_id = case_id
          AND ei.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "entity mentions own delete" ON public.entity_mentions
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );

CREATE POLICY "entity relationships own select" ON public.entity_relationships
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "entity relationships own insert" ON public.entity_relationships
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities source WHERE source.id = source_entity_id AND source.case_id = case_id AND source.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities target WHERE target.id = target_entity_id AND target.case_id = case_id AND target.user_id = auth.uid())
    AND source_entity_id <> target_entity_id
  );
CREATE POLICY "entity relationships own update" ON public.entity_relationships
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities source WHERE source.id = source_entity_id AND source.case_id = case_id AND source.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities target WHERE target.id = target_entity_id AND target.case_id = case_id AND target.user_id = auth.uid())
    AND source_entity_id <> target_entity_id
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities source WHERE source.id = source_entity_id AND source.case_id = case_id AND source.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.case_entities target WHERE target.id = target_entity_id AND target.case_id = case_id AND target.user_id = auth.uid())
    AND source_entity_id <> target_entity_id
  );
CREATE POLICY "entity relationships own delete" ON public.entity_relationships
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
