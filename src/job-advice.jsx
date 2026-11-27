import { Glyph } from './art.jsx';
import { recommendJobs } from './job-fit.js';
import { WORK_ROLE_ICONS } from './orchard.js';
import { hasResearch } from './research.js';

export function availablePerkJobs(state, places) {
  const jobs = new Set(places.flatMap(place => place.roles));
  if (hasResearch(state,'training')) jobs.add('training');
  return jobs;
}

export function JobAdvice({ places, worker }) {
  const suggestions = recommendJobs(places,worker);
  if (!suggestions.length) return null;
  return <section className="job-advice" aria-label="Подходящая работа">
    <strong>Подходит для работы</strong>
    <ul>{suggestions.map(job => <li key={job.key}><Glyph name={WORK_ROLE_ICONS[job.role]}/>{job.label}</li>)}</ul>
  </section>;
}
