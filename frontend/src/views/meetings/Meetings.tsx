import type { ViewProps } from '../../lib/nav';
import { setListTab } from './helpers';
import MeetingCenter from './MeetingCenter';
import MeetingEditor from './MeetingEditor';
import MeetingList from './MeetingList';
import MeetingView from './MeetingView';
import Schedule from './Schedule';

/**
 * Routing for the whole Meetings area, driven by the single `param` segment:
 *   #/meetings                  list (Logged | Scheduled)
 *   #/meetings/new              editor, blank
 *   #/meetings/start:<schedId>  editor, prefilled from a scheduled meeting
 *   #/meetings/center:<name>    every meeting of one center
 *   #/meetings/schedule         scheduling screen (calendar + form)
 *   #/meetings/edit:<id>        editor for an existing meeting
 *   #/meetings/<id>             read-only minutes
 */
const Meetings = ({ param, go }: ViewProps) => {
  if (param === 'schedule') return <Schedule param={param} go={go} />;

  if (param?.startsWith('center:')) {
    let name = param.slice('center:'.length);
    try { name = decodeURIComponent(name); } catch { /* keep as is */ }
    return <MeetingCenter key={param} name={name} go={go} />;
  }

  if (param === 'new') {
    return <MeetingEditor key="new" id="new" onDone={(savedId) => go('meetings', savedId)} />;
  }

  if (param?.startsWith('start:')) {
    const scheduledId = param.slice('start:'.length);
    return (
      <MeetingEditor
        key={param}
        id="new"
        scheduledMeetingId={scheduledId}
        onDone={(savedId) => { if (!savedId) setListTab('scheduled'); go('meetings', savedId); }}
      />
    );
  }

  if (param?.startsWith('edit:')) {
    const id = param.slice('edit:'.length);
    return <MeetingEditor key={param} id={id} onDone={(savedId) => go('meetings', savedId || id)} />;
  }

  if (param) return <MeetingView key={param} id={param} go={go} />;

  return <MeetingList go={go} />;
};

export default Meetings;
