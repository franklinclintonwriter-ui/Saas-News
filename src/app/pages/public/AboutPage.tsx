import { Users, Award, Globe, Target } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import StaticPageArticle from '../../components/public/StaticPageArticle';

export default function AboutPage() {
  const { state } = useCms();
  const brand = state.settings.siteTitle || state.settings.organizationName || 'Publication';
  const page = state.pages.find((item) => item.slug === 'about' && item.status === 'PUBLISHED');
  if (page) return <StaticPageArticle page={page} fallbackTitle={`About ${brand}`} />;

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-[#194890] text-white py-12 md:py-20">
        <div className="max-w-[1440px] mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">About {brand}</h1>
          <p className="text-base md:text-xl opacity-90 max-w-3xl mx-auto">
            Your trusted source for breaking news, in-depth analysis, and compelling stories from around the world.
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center mb-16">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-[#6B7280]">
              <p>
                Founded from a simple belief, {brand} exists because everyone deserves access to accurate,
                unbiased news coverage. In an era of information overload, we recognized the need for a platform
                that cuts through the noise and delivers what matters most.
              </p>
              <p>
                Our team of dedicated journalists, editors, and analysts work around the clock to bring you
                comprehensive coverage of global events, business developments, technological innovations, and
                cultural trends. We're committed to upholding the highest standards of journalistic integrity.
              </p>
              <p>
                Today, {brand} gives readers the context
                they need to stay informed and engaged with the world around them.
              </p>
            </div>
          </div>
          <div className="h-96 bg-[#E5E7EB] rounded-lg flex items-center justify-center">
            <span className="text-[#6B7280]">Our Newsroom</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: Users, title: 'Expert Team', description: '200+ journalists worldwide' },
            { icon: Award, title: 'Award-Winning', description: '50+ journalism awards' },
            { icon: Globe, title: 'Global Reach', description: 'Coverage in 150+ countries' },
            { icon: Target, title: 'Accuracy First', description: '98% fact-check rating' },
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
            To empower readers with accurate, timely, and insightful journalism that helps them understand
            and navigate our complex world. We believe that informed citizens are the foundation of a
            healthy democracy.
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
                We embrace new technologies and storytelling methods to serve our readers better.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Leadership Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Sarah Johnson', role: 'Editor-in-Chief' },
              { name: 'Michael Chen', role: 'Managing Editor' },
              { name: 'Emma Davis', role: 'Head of Investigative' },
              { name: 'David Wilson', role: 'Technology Editor' },
            ].map((member, idx) => (
              <div key={idx} className="text-center">
                <div className="w-32 h-32 bg-[#E5E7EB] rounded-full mx-auto mb-4" />
                <h3 className="font-bold">{member.name}</h3>
                <p className="text-sm text-[#6B7280]">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
