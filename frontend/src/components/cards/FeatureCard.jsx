function FeatureCard({ icon, title, description }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">

      <div className="text-emerald-400">
        {icon}
      </div>

      <h3 className="mt-4 text-2xl font-bold text-white">
        {title}
      </h3>

      <p className="mt-2 text-base leading-7 text-gray-300">
        {description}
      </p>

    </div>
  );
}

export default FeatureCard;