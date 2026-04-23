import { useForm } from 'react-hook-form';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { toast } from '../../lib/notify';
import { apiRequest } from '../../lib/api-client';
import { useCms } from '../../context/cms-context';

type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};

function parseOfficeLocations(raw: string, fallbackAddress: string, fallbackPhone: string) {
  const offices = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [city = '', address = '', phone = ''] = line.split('|').map((part) => part.trim());
      return { city, address, phone };
    })
    .filter((office) => office.city && office.address);

  if (offices.length) return offices;
  if (fallbackAddress) return [{ city: 'Main office', address: fallbackAddress, phone: fallbackPhone }];
  return [];
}

export default function ContactPage() {
  const { state } = useCms();
  const { settings } = state;
  const pressEmail = settings.pressEmail || settings.contactEmail;
  const advertisingEmail = settings.advertisingEmail || settings.supportEmail;
  const tipsEmail = settings.tipsEmail || settings.contactEmail;
  const businessHours = settings.businessHours || 'Sunday-Thursday 9am-6pm';
  const offices = parseOfficeLocations(settings.officeLocations, settings.address, settings.phone);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      subject: 'General Inquiry',
      message: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiRequest('/public/contact', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('Message received. Our team typically responds within one business day.');
      reset({ ...values, firstName: '', lastName: '', email: '', message: '', subject: 'General Inquiry' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send your message.');
    }
  });

  return (
    <div className="bg-[#F3F4F6] min-h-screen">
      <div className="bg-[#194890] text-white py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-base md:text-xl opacity-90">Get in touch with our team. We&apos;d love to hear from you.</p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
              <form className="space-y-6" onSubmit={onSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contact-first" className="block text-sm font-semibold mb-2">
                      First Name
                    </label>
                    <input
                      id="contact-first"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
                      aria-invalid={!!errors.firstName}
                      {...register('firstName', { required: 'First name is required.' })}
                    />
                    {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="contact-last" className="block text-sm font-semibold mb-2">
                      Last Name
                    </label>
                    <input
                      id="contact-last"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
                      aria-invalid={!!errors.lastName}
                      {...register('lastName', { required: 'Last name is required.' })}
                    />
                    {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-semibold mb-2">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
                    aria-invalid={!!errors.email}
                    {...register('email', {
                      required: 'Email is required.',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' },
                    })}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-semibold mb-2">
                    Subject
                  </label>
                  <select
                    id="contact-subject"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15"
                    {...register('subject')}
                  >
                    <option>General Inquiry</option>
                    <option>Editorial Feedback</option>
                    <option>Technical Support</option>
                    <option>Advertising</option>
                    <option>Press Inquiry</option>
                    <option>Partnership</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-semibold mb-2">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={6}
                    placeholder="Tell us how we can help you..."
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#194890] focus:ring-2 focus:ring-[#194890]/15 resize-none"
                    aria-invalid={!!errors.message}
                    {...register('message', {
                      required: 'Please enter a message.',
                      minLength: { value: 20, message: 'Message should be at least 20 characters.' },
                    })}
                  />
                  {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#194890] text-white rounded-lg hover:bg-[#2656A8] transition font-semibold disabled:opacity-60"
                >
                  <Send size={20} aria-hidden />
                  {isSubmitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-bold mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#194890] rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Email</p>
                    <a href={`mailto:${settings.contactEmail}`} className="text-sm text-[#6B7280] hover:text-[#194890] block">
                      {settings.contactEmail}
                    </a>
                    <a href={`mailto:${settings.supportEmail}`} className="text-sm text-[#6B7280] hover:text-[#194890] block">
                      {settings.supportEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#194890] rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Phone</p>
                    <p className="text-sm text-[#6B7280]">{settings.phone || 'Phone number will be published soon'}</p>
                    <p className="text-sm text-[#6B7280]">{businessHours}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#194890] rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Address</p>
                    <p className="text-sm text-[#6B7280] whitespace-pre-line">{settings.address || 'Phulpur, Mymensingh\nBangladesh'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-bold mb-4">Press &amp; Media</h3>
              <p className="text-sm text-[#6B7280] mb-4">For press inquiries and media requests, please contact our communications team.</p>
              <a href={`mailto:${pressEmail}`} className="text-sm text-[#194890] font-semibold hover:underline">
                {pressEmail}
              </a>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-bold mb-4">Advertising</h3>
              <p className="text-sm text-[#6B7280] mb-4">Interested in advertising with Phulpur24? Get in touch with our sales team.</p>
              <a href={`mailto:${advertisingEmail}`} className="text-sm text-[#194890] font-semibold hover:underline">
                {advertisingEmail}
              </a>
            </div>

            <div className="bg-[#194890] text-white rounded-lg p-6">
              <h3 className="font-bold mb-4">Tip or Story?</h3>
              <p className="text-sm opacity-90 mb-4">
                Have a news tip or story idea? Our investigative team is always looking for important stories to tell.
              </p>
              <a
                href={`mailto:${tipsEmail}?subject=News%20tip`}
                className="inline-block px-4 py-2 bg-white text-[#194890] rounded-lg font-semibold hover:bg-[#F3F4F6] transition text-sm"
              >
                Submit a Tip
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-lg p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Office Locations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {offices.map((office) => (
              <div key={office.city} className="p-4 border border-[#E5E7EB] rounded-lg">
                <h3 className="font-bold mb-2">{office.city}</h3>
                <p className="text-sm text-[#6B7280] mb-2">{office.address}</p>
                {office.phone && (
                  <a href={`tel:${office.phone.replace(/\s/g, '')}`} className="text-sm text-[#194890] font-semibold hover:underline">
                    {office.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
