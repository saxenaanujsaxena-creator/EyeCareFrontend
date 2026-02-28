import { Stethoscope } from 'lucide-react';

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-blue-600" />
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-800'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}
