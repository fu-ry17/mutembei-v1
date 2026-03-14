export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col pt-20 md:justify-center md:pt-0 items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-bold text-2xl">Mutembei 😂</span>
        </div>
        {children}
      </div>
    </div>
  );
};
