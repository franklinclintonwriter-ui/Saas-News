import { Users, Award, Globe, Target } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import StaticPageArticle from '../../components/public/StaticPageArticle';

export default function AboutPage() {
  const { state } = useCms();
  const brand = state.settings.siteTitle || state.settings.organizationName || 'Publication';
  const page = state.pages.find((item) => item.slug === 'about' && item.status === 'PUBLISHED');
  if (page) return <StaticPageArticle page={page} fallbackTitle={`About ${brand}`} />;
  const publishedCount = state.posts.filter((post) => post.status === 'Published').length;
  const categoryCount = state.categories.length;
  const staffCount = state.users.length;

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-[#194890] text-white py-12 md:py-20">
        <div className="max-w-[1440px] mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">About {brand}</h1>
          <p className="text-base md:text-xl opacity-90 max-w-3xl mx-auto">
            Verified local reporting, service journalism, and community updates for Phulpur, Mymensingh.
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center mb-16">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-[#6B7280]">
              <p>
                {brand} exists to make local information easier to verify, understand, and act on. We focus on
                Phulpur and surrounding communities, where accurate updates can directly affect daily life.
              </p>
              <p>
                Our newsroom workflow prioritizes primary sources, local voices, corrections, and clear context. The
                goal is simple: publish useful reporting without noise or unnecessary distance from readers.
              </p>
              <p>
                Today, {brand} gives readers a focused place to follow civic updates, infrastructure, education,
                public services, culture, and community stories from Phulpur.
              </p>
            </div>
          </div>
          <div className="h-96 bg-[#E5E7EB] rounded-lg flex items-center justify-center">
            <span className="text-[#6B7280]">Our Newsroom</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: Users, title: 'Local Team', description: `${staffCount || 'Verified'} newsroom profiles` },
            { icon: Award, title: 'Public Interest', description: `${publishedCount} published local stories` },
            { icon: Globe, title: 'Community Coverage', description: `${categoryCount} active coverage areas` },
            { icon: Target, title: 'Accuracy First', description: 'Verification before publication' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="text-center p-6 bg-[#F3F4F6] rounded-lg">
                <div className="w-16 h-16 bg-[#194890] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-white" size={32} />
                </div>
                <h3 className="font-bold mb-2">{stat.title}</h3>
                <p className="text-sm text-[#6B7280]">{stat.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-[#F3F4F6] rounded-lg p-8 md:p-12 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Our Mission</h2>
          <p className="text-lg text-[#6B7280] text-center max-w-3xl mx-auto mb-8">
            To help Phulpur readers make better decisions with timely, verified, and clearly explained local
            journalism. We believe community news is strongest when it is accountable to the people it serves.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg">
              <h3 className="font-bold mb-3">Integrity</h3>
              <p className="text-sm text-[#6B7280]">
                We uphold the highest standards of journalistic ethics and accuracy in all our reporting.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <h3 className="font-bold mb-3">Independence</h3>
              <p className="text-sm text-[#6B7280]">
                Our editorial decisions are free from commercial or political influence.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <h3 className="font-bold mb-3">Innovation</h3>
              <p className="text-sm text-[#6B7280]">
                We use modern publishing tools to make local reporting faster, clearer, and easier to access.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Leadership Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(state.users.length ? state.users.slice(0, 4) : [{ name: brand, title: 'Editorial Desk' }]).map((member, idx) => (
              <div key={idx} className="text-center">
                <div className="w-32 h-32 bg-[#E5E7EB] rounded-full mx-auto mb-4" />
                <h3 className="font-bold">{member.name}</h3>
                <p className="text-sm text-[#6B7280]">{'role' in member ? member.role : member.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
