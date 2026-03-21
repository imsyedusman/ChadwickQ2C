import QuoteList from '@/components/Dashboard/QuoteList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <QuoteList />
      </div>
    </main>
  );
}
