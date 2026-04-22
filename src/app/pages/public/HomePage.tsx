import type { FormEvent } from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import NewsCard from '../../components/public/NewsCard';
import AdSlot from '../../components/public/AdSlot';
import { TrendingUp, Mail, Play } from 'lucide-react';
import { toast } from '../../lib/notify';
import { recordNewsletterSignup } from '../../lib/newsletter-storage';
import { useCms } from '../../context/cms-context';
import { adminPostToListItem, allPublicListItems, imageUrlForPost, publishedPosts } from '../../lib/public-content';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HomePage() {
  const { state } = useCms();

  const published = useMemo(() => publishedPosts(state.posts), [state.posts]);
  const listItems = useMemo(() => allPublicListItems(state), [state]);
  const featuredPost = useMemo(
    () => published.find((p) => p.featured) ?? published[0],
    [published],
  );
  const featuredItem = useMemo(
    () => (featuredPost ? adminPostToListItem(state, featuredPost) : listItems[0]),
    [state, featuredPost, listItems],
  );
  const imageByPostId = useMemo(() => {
    return new Map(published.map((post) => [post.id, imageUrlForPost(state, post)]));
  }, [published, state]);
  const featuredImageUrl = featuredPost ? imageByPostId.get(featuredPost.id) : undefined;

  const sidebarLatest = useMemo(() => {
    const rest = published
      .filter((p) => p.id !== featuredPost?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4)
      .map((p) => adminPostToListItem(state, p));
    return rest;
  }, [published, featuredPost, state]);

  const trending = useMemo(() => {
    return [...published].sort((a, b) => b.views - a.views).slice(0, 4).map((p) => adminPostToListItem(state, p));
  }, [published, state]);

  const latestGrid = useMemo(() => {
    return [...published]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 12)
      .map((p) => adminPostToListItem(state, p));
  }, [published, state]);

  const popularSidebar = useMemo(() => {
    return [...published].sort((a, b) => b.views - a.views).slice(0, 3).map((p) => adminPostToListItem(state, p));
  }, [published, state]);

  const techSection = useMemo(() => {
    const tech = published.filter((p) => p.categorySlug === 'technology').sort((a, b) => b.views - a.views);
    const hero = tech[0];
    const side = tech.slice(1, 5).map((p) => adminPostToListItem(state, p));
    return { hero, side };
  }, [published, state]);

  const videoHighlights = useMemo(() => {
    const tagged = published
      .filter((p) => p.tags.some((tag) => ['video', 'highlights', 'live-updates'].includes(tag)))
      .sort((a, b) => b.views - a.views);
    const fallback = [...published].sort((a, b) => b.views - a.views);
    const unique = [...new Map([...tagged, ...fallback].map((post) => [post.id, post])).values()];
    const durations = ['5:32', '3:48', '7:15', '4:06'];

    return unique.slice(0, 4).map((post, index) => ({
      item: adminPostToListItem(state, post),
      imageUrl: imageUrlForPost(state, post),
      duration: durations[index] ?? post.readTime.replace(/\s*min(?:ute)?s?\s*(?:read)?/i, ':00'),
    }));
  }, [published, state]);

  const onNewsletter = async (e: FormEvent<HTMLFormElement>, source: 'sidebar' | 'homepage') => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '')
      .trim()
      .toLowerCase();
    if (!emailPattern.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    try {
      await recordNewsletterSignup(email, source);
      toast.success("You're subscribed. A confirmation has been queued to your inbox.");
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to subscribe right now.');
    }
  };

  if (!featuredItem) {
    return (
      <div className="bg-[#F3F4F6] min-h-[40vh] flex items-center justify-center px-4">
        <p className="text-center text-[#6B7280]">No published stories yet. Publish a post in the admin console to populate the homepage.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6]">
      <section className="bg-white py-6 md:py-12">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2">
              <NewsCard
                id={featuredItem.id}
                title={featuredItem.title}
                category={featuredItem.category}
                date={featuredItem.date}
                excerpt={featuredItem.excerpt}
                imageUrl={featuredImageUrl}
                featured
              />
            </div>
            <div className="space-y-4">
              {sidebarLatest.map((news) => (
                <Link key={news.id} to={`/article/${news.id}`} className="flex gap-3 pb-4 border-b border-[#E5E7EB] last:border-0 group">
                  <div className="w-24 h-24 bg-[#E5E7EB] rounded flex-shrink-0 overflow-hidden">
                    {(() => {
                      const url = imageByPostId.get(news.id);
                      return url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null;
                    })()}
                  </div>
                  <div>
                    <span className="text-xs text-[#194890] font-semibold">{news.category}</span>
                    <h4 className="font-semibold text-sm mt-1 line-clamp-2 group-hover:text-[#194890]">{news.title}</h4>
                    <p className="text-xs text-[#6B7280] mt-1">{news.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <TrendingUp className="text-[#DC2626]" size={20} />
            <h2 className="text-xl md:text-2xl font-bold">Trending Now</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {trending.map((news) => (
              <Link key={news.id} to={`/article/${news.id}`} className="bg-white rounded-lg p-4 border border-[#E5E7EB] block hover:shadow-md transition">
                <div className="w-full h-32 bg-[#E5E7EB] rounded mb-3 overflow-hidden">
                  {(() => {
                    const url = imageByPostId.get(news.id);
                    return url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null;
                  })()}
                </div>
                <span className="text-xs text-[#194890] font-semibold">{news.category}</span>
                <h3 className="font-semibold text-sm mt-2 line-clamp-2">{news.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-[1440px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Latest News</h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {latestGrid.map((news) => (
                  <NewsCard
                    key={news.id}
                    id={news.id}
                    title={news.title}
                    category={news.category}
                    date={news.date}
                    excerpt={news.excerpt}
                    imageUrl={imageByPostId.get(news.id)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-[#F3F4F6] rounded-lg p-6">
                <h3 className="font-bold mb-4">Popular Posts</h3>
                <div className="space-y-3">
                  {popularSidebar.map((news, idx) => (
                    <Link key={news.id} to={`/article/${news.id}`} className="flex gap-3 group">
                      <span className="text-2xl font-bold text-[#E5E7EB]">{idx + 1}</span>
                      <div>
                        <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-[#194890]">{news.title}</h4>
                        <p className="text-xs text-[#6B7280] mt-1">{news.date}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#194890]/15 bg-[#194890] p-5 text-white shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Mail className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight">Newsletter</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/85">
                      Morning briefing: top stories and analysis. Unsubscribe anytime.
                    </p>
                  </div>
                </div>
                <form
                  className="mt-5 flex flex-col gap-2"
                  onSubmit={(e) => onNewsletter(e, 'sidebar')}
                  aria-label="Sidebar newsletter signup"
                >
                  <label htmlFor="sidebar-newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="sidebar-newsletter-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Email address"
                    className="min-h-11 w-full rounded-lg border border-white/25 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <button
                    type="submit"
                    className="min-h-11 w-full rounded-lg bg-white px-4 text-sm font-semibold text-[#194890] transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#194890]"
                  >
                    Subscribe
                  </button>
                </form>
              </div>

              <AdSlot placement="home-sidebar" fallbackSize="300x250" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="max-w-[1440px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Technology</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2">
              {techSection.hero ? (
                <Link to={`/article/${techSection.hero.id}`} className="block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="h-64 bg-[#E5E7EB] sm:h-72 lg:h-80 overflow-hidden">
                    {(() => {
                      const url = imageByPostId.get(techSection.hero!.id);
                      return url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null;
                    })()}
                  </div>
                  <div className="p-6">
                    <span className="text-sm text-[#194890] font-semibold">Technology</span>
                    <h3 className="text-xl font-bold mt-2 mb-3">{techSection.hero.title}</h3>
                    <p className="text-[#6B7280]">{techSection.hero.excerpt}</p>
                  </div>
                </Link>
              ) : (
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-[#6B7280]">No technology stories published yet.</div>
              )}
            </div>
            <div className="space-y-4">
              {techSection.side.map((news) => (
                <Link key={news.id} to={`/article/${news.id}`} className="flex gap-3 pb-4 border-b border-[#E5E7EB] last:border-0 group">
                  <div className="w-20 h-20 bg-[#E5E7EB] rounded flex-shrink-0 overflow-hidden">
                    {(() => {
                      const url = imageByPostId.get(news.id);
                      return url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null;
                    })()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-[#194890]">{news.title}</h4>
                    <p className="text-xs text-[#6B7280] mt-1">{news.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-[1440px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Videos & Highlights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {videoHighlights.map(({ item, imageUrl, duration }) => (
              <Link key={item.id} to={`/article/${item.id}`} className="block bg-[#F3F4F6] rounded-lg overflow-hidden group hover:shadow-md transition">
                <div className="relative h-48 bg-[#111827] overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full bg-[#E5E7EB]" />
                  )}
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110">
                      <Play className="ml-1 h-8 w-8 text-[#194890]" fill="currentColor" aria-hidden />
                    </span>
                  </div>
                  <span className="absolute bottom-3 right-3 rounded bg-black/75 px-2 py-1 text-xs font-semibold text-white">{duration}</span>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-[#194890]">{item.category}</p>
                  <h4 className="mt-2 font-semibold text-sm line-clamp-2 group-hover:text-[#194890]">{item.title}</h4>
                  <p className="text-xs text-[#6B7280] mt-2">{item.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-y border-white/10 bg-[#194890] py-12 text-white sm:py-14 md:py-16 lg:py-20"
        aria-labelledby="newsletter-heading"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:text-left">
            <div className="lg:col-span-6">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 lg:mx-0">
                <Mail className="h-7 w-7 shrink-0" aria-hidden />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Newsletter</p>
              <h2 id="newsletter-heading" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Stay informed
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg lg:mx-0">
                Receive our editorial briefing each weekday—curated headlines, context, and analysis. No spam; one click
                to unsubscribe.
              </p>
            </div>
            <div className="mt-10 lg:col-span-6 lg:mt-0">
              <form
                className="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
                onSubmit={(e) => onNewsletter(e, 'homepage')}
                aria-label="Homepage newsletter signup"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0 sm:overflow-hidden sm:rounded-xl sm:bg-white sm:p-1 sm:shadow-lg">
                  <label htmlFor="homepage-newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="homepage-newsletter-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="min-h-12 w-full flex-1 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/60 backdrop-blur-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40 sm:border-0 sm:bg-transparent sm:text-neutral-900 sm:placeholder:text-neutral-500 sm:focus:ring-[#194890]/25"
                  />
                  <button
                    type="submit"
                    className="min-h-12 w-full shrink-0 rounded-xl bg-white px-6 text-base font-semibold text-[#194890] transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#194890] sm:w-auto sm:rounded-lg sm:px-8"
                  >
                    Subscribe
                  </button>
                </div>
                <p className="mt-4 text-center text-xs leading-relaxed text-white/65 sm:text-left">
                  By subscribing you agree to our{' '}
                  <Link
                    to="/privacy"
                    className="underline decoration-white/40 underline-offset-2 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-sm"
                  >
                    Privacy Policy
                  </Link>
                  . We never sell your data.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
