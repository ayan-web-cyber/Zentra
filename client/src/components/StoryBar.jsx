import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';

export default function StoryBar() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [viewingIndex, setViewingIndex] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await api.get('/stories/feed');
    setGroups(data.groups);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-1">
        <div className="flex flex-shrink-0 flex-col items-center gap-1.5">
          <button
            onClick={() => setCreating(true)}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-aurora-border transition-aurora hover:border-aurora-violet"
          >
            <Plus size={20} className="text-aurora-text-muted" />
          </button>
          <span className="text-xs text-aurora-text-muted">Your story</span>
        </div>

        {groups.map((group, i) => (
          <button
            key={group.author._id}
            onClick={() => setViewingIndex(i)}
            className="flex flex-shrink-0 flex-col items-center gap-1.5"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full p-[2px]"
              style={{
                backgroundImage: group.allViewed
                  ? 'none'
                  : 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                border: group.allViewed ? '2px solid #26304A' : 'none',
              }}
            >
              <Avatar
                src={group.author.avatarUrl}
                name={group.author.name}
                size={60}
                className="border-2 border-aurora-card"
              />
            </div>
            <span className="max-w-[64px] truncate text-xs text-aurora-text-muted">
              {group.author._id === user?._id ? 'You' : group.author.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {viewingIndex !== null && (
        <StoryViewer
          groups={groups}
          startIndex={viewingIndex}
          onClose={() => {
            setViewingIndex(null);
            load();
          }}
        />
      )}

      {creating && (
        <CreateStoryModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </>
  );
}
