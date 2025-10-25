-- Maintain leads aggregates and score on new messages and thread updates

-- Helper function to recompute lead aggregates for a given thread
CREATE OR REPLACE FUNCTION public.update_lead_from_thread_id(p_thread_id uuid) RETURNS void AS $$
DECLARE
  v_team_id uuid;
  v_channel text;
  v_last_interaction timestamptz;
  v_msg_count int;
  v_platform_score int := 50;
  v_engagement int := 0;
  v_recency int := 0;
  v_total int := 0;
BEGIN
  SELECT t.team_id, t.channel, COALESCE(t.last_message_at, now())
    INTO v_team_id, v_channel, v_last_interaction
  FROM public.communication_threads t
  WHERE t.id = p_thread_id;

  IF v_team_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*)::int INTO v_msg_count
  FROM public.communication_messages m
  WHERE m.team_id = v_team_id
    AND m.thread_id = p_thread_id
    AND m.created_at >= now() - interval '7 days';

  -- Determine last interaction as max of thread.last_message_at and latest message
  SELECT GREATEST(v_last_interaction, COALESCE(MAX(created_at), 'epoch')) INTO v_last_interaction
  FROM public.communication_messages m
  WHERE m.team_id = v_team_id AND m.thread_id = p_thread_id;

  -- Platform weights per v0 logic
  v_platform_score := CASE
    WHEN v_channel = 'whatsapp' THEN 100
    WHEN v_channel = 'instagram' THEN 70
    WHEN v_channel = 'telegram' THEN 60
    ELSE 50
  END;

  v_engagement := LEAST(v_msg_count * 10, 100);
  v_recency := GREATEST(100 - ((EXTRACT(EPOCH FROM (now() - COALESCE(v_last_interaction, now()))) / 86400)::int * 5), 0);
  v_total := ROUND(v_engagement * 0.3 + v_platform_score * 0.25 + v_recency * 0.25 + 0);

  UPDATE public.leads l
    SET message_count = v_msg_count,
        last_interaction_at = v_last_interaction,
        score = v_total,
        qualification = CASE WHEN v_total >= 70 THEN 'hot' WHEN v_total >= 40 THEN 'warm' ELSE 'cold' END,
        updated_at = now()
  WHERE l.thread_id = p_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for messages
CREATE OR REPLACE FUNCTION public.trgfn_leads_on_message() RETURNS trigger AS $$
BEGIN
  PERFORM public.update_lead_from_thread_id(NEW.thread_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for threads
CREATE OR REPLACE FUNCTION public.trgfn_leads_on_thread() RETURNS trigger AS $$
BEGIN
  PERFORM public.update_lead_from_thread_id(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on new/updated messages
DROP TRIGGER IF EXISTS trg_leads_on_message_ins ON public.communication_messages;
CREATE TRIGGER trg_leads_on_message_ins
AFTER INSERT OR UPDATE OF created_at ON public.communication_messages
FOR EACH ROW
EXECUTE FUNCTION public.trgfn_leads_on_message();

-- Trigger on thread last_message_at change
DROP TRIGGER IF EXISTS trg_leads_on_thread_update ON public.communication_threads;
CREATE TRIGGER trg_leads_on_thread_update
AFTER UPDATE OF last_message_at ON public.communication_threads
FOR EACH ROW
WHEN (NEW.last_message_at IS DISTINCT FROM OLD.last_message_at)
EXECUTE FUNCTION public.trgfn_leads_on_thread();
