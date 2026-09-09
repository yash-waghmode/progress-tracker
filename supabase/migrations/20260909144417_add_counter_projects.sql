-- Add compact number-based progress alongside the existing task-list mode.

begin;

alter table public.projects
  add column tracking_mode text not null default 'tasks',
  add column target_total integer,
  add column current_value integer,
  add column unit_label text,
  add constraint projects_tracking_mode_check
    check (tracking_mode in ('tasks', 'counter')),
  add constraint projects_counter_shape_check
    check (
      (
        tracking_mode = 'tasks'
        and target_total is null
        and current_value is null
        and unit_label is null
      )
      or
      (
        tracking_mode = 'counter'
        and target_total between 1 and 1000000
        and current_value between 0 and target_total
        and char_length(trim(unit_label)) between 1 and 40
      )
    );

commit;
