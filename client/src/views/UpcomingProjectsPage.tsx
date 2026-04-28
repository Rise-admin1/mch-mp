'use client'

const Upcomingprojectspage = () => {
  // This would typically come from an API, but for demonstration purposes, we'll hardcode it
  const Projects = [
    {
      id: 1,
      date: 'April 24, 2025',
      title: 'Samia Women Business Expo',
      description:`An ongoing initiative focused on mobilizing and supporting women in Samia through entrepreneurship, collaboration, and access to business opportunities.`,
      image: 'https://funyula.s3.ap-south-1.amazonaws.com/funyula-images/banner-1.jpeg'
    },
   
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseProjectDate = (dateString: string) => {
    const parsedDate = new Date(dateString);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate;
  };

  const upcomingProjects = Projects.filter((project) => {
    const projectDate = parseProjectDate(project.date);
    return projectDate >= today;
  });

  const pastProjects = Projects.filter((project) => {
    const projectDate = parseProjectDate(project.date);
    return projectDate < today;
  });

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex-1">
        <div className="relative h-screen flex items-center justify-center bg-[url('https://dubaianalytica.com/wp-content/uploads/2025/03/89_1.47.1.jpg')] bg-cover bg-center bg-no-repeat">
          <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center px-4 mb-2 sm:mb-4">Upcoming Projects</h1>
          </div>
        </div>

        {/* Upcoming projects header */}
        <div className="max-w-6xl mx-auto px-4 flex justify-center border-b-4 border-trump-maingreen  py-8 mb-6">
          <h2 className="text-xl 2xl:text-xl font-semibold uppercase  ">
            Upcoming Projects
          </h2>
        </div>

        {/* Upcoming projects list */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="space-y-6 mb-12">
            {upcomingProjects.map(item => (
              <div
                key={item.id}
                className="block border-b border-gray-200 pb-6 hover:bg-gray-50 transition duration-150"
              >
                <div className="text-sm text-gray-600">{item.date}</div>
                <h3 className="text-xl font-bold text-[#263a66]">{item.title}</h3>
                <p className="mt-2 text-gray-700">{item.description}</p>
              </div>
            ))}
            {upcomingProjects.length === 0 && (
              <p className="text-gray-600">No upcoming projects at the moment.</p>
            )}
          </div>

          <div className="max-w-6xl mx-auto px-4 flex justify-center border-b-4 border-trump-maingreen  py-8 mb-6">
            <h2 className="text-xl 2xl:text-xl font-semibold uppercase">
              Past Projects
            </h2>
          </div>

          <div className="space-y-6">
            {pastProjects.map(item => (
              <div
                key={item.id}
                className="block border-b border-gray-200 pb-6 hover:bg-gray-50 transition duration-150"
              >
                <div className="text-sm text-gray-600">{item.date}</div>
                <h3 className="text-xl font-bold text-[#263a66]">{item.title}</h3>
                <p className="mt-2 text-gray-700">{item.description}</p>
              </div>
            ))}
            {pastProjects.length === 0 && (
              <p className="text-gray-600">No past projects yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upcomingprojectspage;
