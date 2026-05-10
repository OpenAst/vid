type CompletionUser = {
  first_name?: string | null;
  last_name?: string | null;
  following_count?: number | null;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
    skill_tags?: string | null;
    availability_status?: string | null;
  } | null;
};

export type CompletionItem = {
  id: string;
  label: string;
  completed: boolean;
};

export function getProfileCompletionItems(user?: CompletionUser | null): CompletionItem[] {
  const profile = user?.profile;

  return [
    {
      id: "avatar",
      label: "Add an avatar",
      completed: Boolean(profile?.avatar),
    },
    {
      id: "name",
      label: "Add your name",
      completed: Boolean(user?.first_name || user?.last_name),
    },
    {
      id: "bio",
      label: "Write a short bio",
      completed: Boolean(profile?.bio?.trim()),
    },
    {
      id: "skills",
      label: "Add skill tags",
      completed: Boolean(profile?.skill_tags?.trim()),
    },
    {
      id: "follows",
      label: "Follow one creator",
      completed: Number(user?.following_count || 0) > 0,
    },
  ];
}

export function getProfileCompletion(user?: CompletionUser | null) {
  const items = getProfileCompletionItems(user);
  const completedCount = items.filter((item) => item.completed).length;
  const percent = Math.round((completedCount / items.length) * 100);

  return {
    items,
    completedCount,
    percent,
    missingItems: items.filter((item) => !item.completed),
    totalCount: items.length,
  };
}
