import type { Course, Episode } from './types';

/** 按用户勾选的合集裁成一门可排课的课程。只选一门时标题用该合集名。 */
export function courseFromSections(course: Course, sectionIds: string[]): Course {
  const selected = course.sections?.filter((section) => sectionIds.includes(section.id)) ?? [];
  if (!selected.length) return course;

  const allowed = new Set(selected.map((section) => section.id));
  const source = course.episodes.filter((episode) => episode.sectionId && allowed.has(episode.sectionId));
  const multi = selected.length > 1;
  const episodes: Episode[] = source.map((episode, index) => {
    const section = selected.find((item) => item.id === episode.sectionId);
    const title = multi && section ? `${section.title} · ${episode.title}` : episode.title;
    return { index, title, duration: episode.duration };
  });

  return {
    bvid: course.bvid,
    title: selected.length === 1 ? selected[0].title : course.title,
    cover: course.cover,
    totalSeconds: episodes.reduce((sum, episode) => sum + episode.duration, 0),
    episodes
  };
}
