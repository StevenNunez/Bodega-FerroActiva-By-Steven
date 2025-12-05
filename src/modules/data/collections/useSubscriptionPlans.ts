
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/modules/core/lib/firebase';
import { PLANS as PLANS_DEFAULT } from '@/modules/core/lib/permissions';

export function useSubscriptionPlans() {
    const [plans, setPlans] = useState<any>(null);

    useEffect(() => {
        const plansRef = query(collection(db, 'subscriptionPlans'), orderBy('order', 'asc'));
        const unsub = onSnapshot(plansRef, (snap) => {
            if (snap.empty) {
                setPlans(PLANS_DEFAULT);
            } else {
                const fetchedPlans = snap.docs.reduce((acc, doc) => {
                    acc[doc.id] = { id: doc.id, ...doc.data() };
                    return acc;
                }, {} as any);
                setPlans(fetchedPlans);
            }
        }, (error) => {
            console.error("Error fetching subscription plans, falling back to default:", error);
            setPlans(PLANS_DEFAULT);
        });

        return () => unsub();
    }, []);

    return plans;
}
